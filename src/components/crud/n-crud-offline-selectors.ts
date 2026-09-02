import type { SyncConflict, SyncResource } from '@/contracts/sync';

export function selectSyncConflicts(state: {
  Conflicts: SyncConflict[];
}): SyncConflict[] {
  return state.Conflicts;
}

export function filterResourceConflicts(
  conflicts: SyncConflict[],
  resource: SyncResource,
): SyncConflict[] {
  return conflicts.filter((conflict) => conflict.Resource === resource);
}
