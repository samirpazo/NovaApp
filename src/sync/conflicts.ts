import { localStorageKey, type DirtyRaw } from '@nozbe/watermelondb';
import { create } from 'zustand';

import { useAuthStore } from '@/auth/store';
import {
  SyncConflictSchema,
  SyncConflictResolutionSchema,
  SyncPullChangeSchema,
  type SyncConflict,
  type SyncConflictResolution,
  type SyncPushChange,
  type SyncResource,
} from '@/contracts/sync';
import { getActiveDatabase, type EntityBaseModel } from '@/database';

const conflictStorageKey = (userId: number) =>
  localStorageKey<SyncConflict[]>(`nova.sync.conflicts.user.${userId}`);

const conflictKey = (resource: SyncResource, syncId: string) =>
  `${resource}:${syncId}`;

function currentUserId(): number | null {
  return useAuthStore.getState().Session?.User.UsrID ?? null;
}

function isActive(database: ReturnType<typeof getActiveDatabase>): boolean {
  try {
    return getActiveDatabase() === database;
  } catch {
    return false;
  }
}

async function writeConflicts(
  userId: number,
  conflicts: SyncConflict[],
  database = getActiveDatabase(),
): Promise<void> {
  await database.localStorage.set(conflictStorageKey(userId), conflicts);
  if (currentUserId() === userId && isActive(database))
    useSyncConflictState.getState().setConflicts(conflicts);
}

export async function getSyncConflicts(
  database = getActiveDatabase(),
): Promise<SyncConflict[]> {
  const userId = currentUserId();
  if (!userId) {
    useSyncConflictState.getState().setConflicts([]);
    return [];
  }
  const stored =
    (await database.localStorage.get(conflictStorageKey(userId))) ?? [];
  const conflicts = SyncConflictSchema.array().parse(stored);
  if (currentUserId() === userId && isActive(database))
    useSyncConflictState.getState().setConflicts(conflicts);
  return conflicts;
}

export async function saveSyncConflicts(
  conflicts: SyncConflict[],
  database = getActiveDatabase(),
): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error('No se puede guardar un conflicto sin sesión.');
  const current = await getSyncConflicts(database);
  const merged = new Map(
    current.map((conflict) => [
      conflictKey(conflict.Resource, conflict.SyncId),
      conflict,
    ]),
  );
  for (const conflict of conflicts)
    merged.set(
      conflictKey(conflict.Resource, conflict.SyncId),
      SyncConflictSchema.parse(conflict),
    );
  await writeConflicts(userId, [...merged.values()], database);
}

export async function removeSyncConflict(
  resource: SyncResource,
  syncId: string,
  database = getActiveDatabase(),
): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error('No se puede resolver un conflicto sin sesión.');
  await writeConflicts(
    userId,
    (await getSyncConflicts(database)).filter(
      (item) =>
        conflictKey(item.Resource, item.SyncId) !==
        conflictKey(resource, syncId),
    ),
    database,
  );
}

export async function keepLocalConflict(
  resource: SyncResource,
  syncId: string,
  database = getActiveDatabase(),
): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error('No se puede resolver un conflicto sin sesión.');
  const conflicts = await getSyncConflicts(database);
  await writeConflicts(userId,
    conflicts.map((item) =>
      conflictKey(item.Resource, item.SyncId) === conflictKey(resource, syncId)
        ? { ...item, KeepLocal: true }
        : item,
    ),
    database,
  );
}

export async function applyServerConflict(
  conflict: SyncConflict,
  database = getActiveDatabase(),
): Promise<void> {
  const change = SyncPullChangeSchema.parse({
    Resource: conflict.Resource,
    SyncId: conflict.SyncId,
    Operation: 'U',
    Data: conflict.ServerData,
  });
  if (!change.Data)
    throw new Error('El servidor no devolvió una versión válida del registro.');

  const remoteRaw: DirtyRaw = { id: change.SyncId, ...change.Data };
  await database.write(async () => {
    const record = await database
      .get<EntityBaseModel>(change.Resource)
      .find(change.SyncId);
    const prepared = record.prepareUpdate((model) => {
      for (const [field, value] of Object.entries(remoteRaw)) {
        if (field !== 'id')
          model._dangerouslySetRawWithoutMarkingColumnChange(
            field,
            value as never,
          );
      }
      model._raw._status = 'synced';
      model._raw._changed = '';
    });
    await database.batch(prepared);
  }, 'resolve sync conflict with server version');
  await removeSyncConflict(conflict.Resource, conflict.SyncId, database);
}

export async function resolveSyncConflict(
  conflict: SyncConflict,
  decision: SyncConflictResolution,
  database = getActiveDatabase(),
): Promise<void> {
  const parsedDecision = SyncConflictResolutionSchema.parse(decision);
  if (
    parsedDecision.Resource !== conflict.Resource ||
    parsedDecision.SyncId !== conflict.SyncId
  ) {
    throw new Error('La decisión no corresponde al conflicto seleccionado.');
  }
  if (parsedDecision.Decision === 'KeepLocal') {
    await keepLocalConflict(parsedDecision.Resource, parsedDecision.SyncId, database);
    return;
  }
  await applyServerConflict(conflict, database);
}

export function conflictForChange(
  conflicts: SyncConflict[],
  change: SyncPushChange,
): SyncConflict | undefined {
  return conflicts.find(
    (item) =>
      item.Resource === change.Resource && item.SyncId === change.SyncId,
  );
}

interface SyncConflictState {
  Conflicts: SyncConflict[];
  setConflicts: (conflicts: SyncConflict[]) => void;
}

export const useSyncConflictState = create<SyncConflictState>((set) => ({
  Conflicts: [],
  setConflicts: (Conflicts) => set({ Conflicts }),
}));
