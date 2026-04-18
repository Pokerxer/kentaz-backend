import { getPendingSales, getAllPendingSales, deletePendingSale, updateSaleStatus, getPendingSalesCount } from './offlineStorage';
import { posApi } from './posApi';

const MAX_RETRIES = 3;

let isSyncing = false;
const syncListeners: Set<() => void> = new Set();

export function addSyncListener(callback: () => void) {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

function notifyListeners() {
  syncListeners.forEach((cb) => cb());
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0, failed: 0 };

  isSyncing = true;
  notifyListeners();

  let synced = 0;
  let failed = 0;

  try {
    const all = await getAllPendingSales();
    // Retry both 'pending' and 'failed' (under retry limit), oldest first
    const toSync = all
      .filter(r => r.status === 'pending' || (r.status === 'failed' && r.retryCount < MAX_RETRIES))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const record of toSync) {
      try {
        await updateSaleStatus(record.localId, 'syncing');
        await posApi.createSale(record.saleData);
        await deletePendingSale(record.localId);
        synced++;
      } catch (error) {
        await updateSaleStatus(record.localId, 'failed', (error as Error).message);
        failed++;
      }
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { synced, failed };
}

export function getIsSyncing() {
  return isSyncing;
}

export async function getSyncStatus(): Promise<{ pending: number; syncing: number; failed: number }> {
  const all = await getAllPendingSales();
  return {
    pending: all.filter((r) => r.status === 'pending').length,
    syncing: all.filter((r) => r.status === 'syncing').length,
    failed:  all.filter((r) => r.status === 'failed').length,
  };
}

export async function getActualPendingCount(): Promise<number> {
  return getPendingSalesCount();
}
