import type { SyncStatus } from '@nozbe/watermelondb/Model';

export type NCrudOfflineStatus = SyncStatus | 'conflict' | 'syncing';

export interface ResolveNCrudOfflineStatusInput {
  syncStatus: SyncStatus;
  hasConflict: boolean;
  isSyncing: boolean;
}

export function resolveNCrudOfflineStatus({
  syncStatus,
  hasConflict,
  isSyncing,
}: ResolveNCrudOfflineStatusInput): NCrudOfflineStatus {
  if (hasConflict) return 'conflict';
  if (isSyncing && syncStatus !== 'synced') return 'syncing';
  return syncStatus;
}

export function isPendingNCrudStatus(status: SyncStatus): boolean {
  return status === 'created' || status === 'updated' || status === 'deleted';
}
