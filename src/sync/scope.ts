import { localStorageKey, type Database } from '@nozbe/watermelondb';

import type { SyncConnection } from '@/sync/config';

const ACTIVE_SCOPE_KEY = localStorageKey<string>('nova.sync.activeScope');
const ACTIVE_SCOPE_USER_KEY = localStorageKey<number>(
  'nova.sync.activeScopeUser',
);
const LEGACY_CONFLICTS_KEY = localStorageKey<unknown>('nova.sync.conflicts');
const UNASSIGNED_LEGACY_CONFLICTS_KEY = localStorageKey<unknown>(
  'nova.sync.conflicts.unassignedLegacy',
);
const scopedConflictsKey = (userId: number) =>
  localStorageKey<unknown>(`nova.sync.conflicts.user.${userId}`);

export function syncScopeFor(
  connection: SyncConnection,
  userId: number,
  personId: number,
): string {
  return `${connection.BaseUrl.replace(/\/+$/, '').toLowerCase()}|${connection.BranchId ?? 'general'}|${personId}|${userId}`;
}

export async function activateSyncScope(
  database: Database,
  connection: SyncConnection,
  userId: number,
  personId: number,
  isCurrent: () => boolean = () => true,
): Promise<{ ready: boolean; scope: string }> {
  const scope = syncScopeFor(connection, userId, personId);
  if (!isCurrent()) return { ready: false, scope };

  const [activeScope, activeUserId, legacyConflicts] = await Promise.all([
    database.localStorage.get(ACTIVE_SCOPE_KEY),
    database.localStorage.get(ACTIVE_SCOPE_USER_KEY),
    database.localStorage.get(LEGACY_CONFLICTS_KEY),
  ]);
  if (!isCurrent()) return { ready: false, scope };

  if (legacyConflicts != null) {
    const scopedConflicts =
      activeUserId === userId
        ? await database.localStorage.get(scopedConflictsKey(userId))
        : null;
    if (
      activeUserId === userId &&
      activeScope === scope &&
      Array.isArray(legacyConflicts) &&
      (scopedConflicts == null || Array.isArray(scopedConflicts))
    ) {
      await database.localStorage.set(scopedConflictsKey(userId), [
        ...(Array.isArray(scopedConflicts) ? scopedConflicts : []),
        ...legacyConflicts,
      ]);
    } else {
      await database.localStorage.set(
        UNASSIGNED_LEGACY_CONFLICTS_KEY,
        legacyConflicts,
      );
    }
    await database.localStorage.remove(LEGACY_CONFLICTS_KEY);
  }

  if (!isCurrent()) return { ready: false, scope };
  await database.localStorage.set(ACTIVE_SCOPE_KEY, scope);
  await database.localStorage.set(ACTIVE_SCOPE_USER_KEY, userId);
  return { ready: isCurrent(), scope };
}
