import fetchLocalChanges from '@nozbe/watermelondb/sync/impl/fetchLocal';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import * as React from 'react';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { getActiveDatabase } from '@/database';
import { getSyncConflicts, useSyncConflictState } from '@/sync/conflicts';
import { useSyncState } from '@/sync/state';

function countLocalChanges(
  changes: Awaited<ReturnType<typeof fetchLocalChanges>>['changes'],
): number {
  return (Object.values(changes) as SyncTableChangeSet[]).reduce(
    (total, table) =>
      total +
      table.created.length +
      table.updated.length +
      table.deleted.length,
    0,
  );
}

export function useSyncIndicators() {
  const database = getActiveDatabase();
  const [pendingChanges, setPendingChanges] = React.useState(0);
  const conflicts = useSyncConflictState((state) => state.Conflicts.length);
  const syncStatus = useSyncState((state) => state.Status);

  const refreshPendingChanges = React.useCallback(async () => {
    const localChanges = await fetchLocalChanges(database);
    setPendingChanges(countLocalChanges(localChanges.changes));
  }, [database]);

  React.useEffect(() => {
    void getSyncConflicts();
    void refreshPendingChanges();

    const subscription = database
      .withChangesForTables(Object.values(SYNC_RESOURCES))
      .subscribe(() => void refreshPendingChanges());

    return () => subscription.unsubscribe();
  }, [database, refreshPendingChanges]);

  React.useEffect(() => {
    if (syncStatus !== 'syncing') void refreshPendingChanges();
  }, [refreshPendingChanges, syncStatus]);

  return { conflicts, pendingChanges };
}
