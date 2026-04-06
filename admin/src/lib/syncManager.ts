import { getPendingSales, deletePendingSale, updateSaleStatus, getAllPendingSales } from './offlineStorage';
import { offlineApi, getDeviceId } from './posApi';

let isSyncing = false;
let syncListeners: Set<() => void> = new Set();

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
    const pending = await getPendingSales();

    for (const record of pending) {
      try {
        await updateSaleStatus(record.localId, 'syncing');
        await offlineApi.queueSale(record.saleData, getDeviceId());
        await deletePendingSale(record.localId);
        synced++;
      } catch (error) {
        await updateSaleStatus(record.localId, 'failed', (error as Error).message);
        failed++;
      }
    }

    // Also try backend sync endpoint for any that were queued before app restart
    try {
      const result = await offlineApi.syncAll(getDeviceId());
      if (result.synced > 0) {
        synced += result.synced;
      }
    } catch {
      // Backend sync is optional
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
    failed: all.filter((r) => r.status === 'failed').length,
  };
}