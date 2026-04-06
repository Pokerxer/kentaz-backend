import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { CreateSaleInput } from './posApi';

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
}

let dbPromise: Promise<IDBPDatabase<POSOfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<POSOfflineDB>('kentaz-pos-offline', 1, {
      upgrade(db) {
        const store = db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status');
        store.createIndex('by-created', 'createdAt');
      },
    });
  }
  return dbPromise;
}

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