import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { CreateSaleInput, PosProduct } from './posApi';

export interface OfflineSaleRecord {
  id?: number;
  localId: string;
  saleData: CreateSaleInput;
  createdAt: Date;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retryCount: number;
}

interface POSOfflineDB extends DBSchema {
  pendingSales: {
    key: number;
    value: OfflineSaleRecord;
    indexes: { 'by-status': string; 'by-created': Date };
  };
  cachedProducts: {
    key: string; // product _id
    value: PosProduct & { cachedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<POSOfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<POSOfflineDB>('kentaz-pos-offline', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'createdAt');
        }
        if (oldVersion < 2) {
          db.createObjectStore('cachedProducts', { keyPath: '_id' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Pending sales ──────────────────────────────────────────────

export async function savePendingSale(saleData: CreateSaleInput): Promise<string> {
  const db = await getDB();
  const localId = crypto.randomUUID();
  await db.add('pendingSales', {
    localId,
    saleData,
    createdAt: new Date(),
    status: 'pending',
    retryCount: 0,
  });
  return localId;
}

export async function getPendingSales(): Promise<OfflineSaleRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingSales', 'by-status', 'pending');
}

export async function getAllPendingSales(): Promise<OfflineSaleRecord[]> {
  const db = await getDB();
  return db.getAll('pendingSales');
}

export async function updateSaleStatus(
  localId: string,
  status: 'pending' | 'syncing' | 'failed',
  error?: string
) {
  const db = await getDB();
  const all = await db.getAll('pendingSales');
  const record = all.find((r) => r.localId === localId);
  if (record?.id) {
    await db.put('pendingSales', {
      ...record,
      status,
      error,
      retryCount: record.retryCount + 1,
    });
  }
}

export async function deletePendingSale(localId: string) {
  const db = await getDB();
  const all = await db.getAll('pendingSales');
  const record = all.find((r) => r.localId === localId);
  if (record?.id) {
    await db.delete('pendingSales', record.id);
  }
}

export async function getPendingSalesCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAllFromIndex('pendingSales', 'by-status', 'pending');
  return all.length;
}

export async function clearAllPendingSales() {
  const db = await getDB();
  const all = await db.getAll('pendingSales');
  for (const record of all) {
    if (record.id) {
      await db.delete('pendingSales', record.id);
    }
  }
}

// ── Product cache ──────────────────────────────────────────────

export async function cacheProducts(products: PosProduct[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedProducts', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...products.map((p) => tx.store.put({ ...p, cachedAt: now })),
    tx.done,
  ]);
}

export async function getCachedProducts(): Promise<PosProduct[]> {
  const db = await getDB();
  const all = await db.getAll('cachedProducts');
  // Strip the cachedAt field before returning
  return all.map(({ cachedAt: _cachedAt, ...p }) => p as PosProduct);
}

export async function getCachedProductsAge(): Promise<number | null> {
  const db = await getDB();
  const all = await db.getAll('cachedProducts');
  if (all.length === 0) return null;
  const oldest = Math.min(...all.map((p) => p.cachedAt));
  return Date.now() - oldest;
}

export async function decrementCachedStock(
  items: { productId: string; variantIndex: number; quantity: number }[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedProducts', 'readwrite');
  for (const item of items) {
    const product = await tx.store.get(item.productId);
    if (product && product.variants[item.variantIndex] !== undefined) {
      const variants = product.variants.map((v, idx) =>
        idx === item.variantIndex
          ? { ...v, stock: Math.max(0, (v.stock ?? 0) - item.quantity) }
          : v
      );
      await tx.store.put({ ...product, variants });
    }
  }
  await tx.done;
}
