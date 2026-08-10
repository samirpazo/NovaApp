import { localStorageKey, type DirtyRaw } from '@nozbe/watermelondb';
import { create } from 'zustand';

import {
  SyncConflictSchema,
  SyncPullChangeSchema,
  type SyncConflict,
  type SyncPushChange,
  type SyncResource,
} from '@/contracts/sync';
import { database, type EntityBaseModel } from '@/database';

const CONFLICTS_KEY = localStorageKey<SyncConflict[]>('nova.sync.conflicts');

const conflictKey = (resource: SyncResource, syncId: string) => `${resource}:${syncId}`;

async function writeConflicts(conflicts: SyncConflict[]): Promise<void> {
  await database.localStorage.set(CONFLICTS_KEY, conflicts);
  useSyncConflictState.getState().setConflicts(conflicts);
}

export async function getSyncConflicts(): Promise<SyncConflict[]> {
  const stored = (await database.localStorage.get(CONFLICTS_KEY)) ?? [];
  const conflicts = SyncConflictSchema.array().parse(stored);
  useSyncConflictState.getState().setConflicts(conflicts);
  return conflicts;
}

export async function saveSyncConflicts(conflicts: SyncConflict[]): Promise<void> {
  const current = await getSyncConflicts();
  const merged = new Map(current.map((conflict) => [conflictKey(conflict.Resource, conflict.SyncId), conflict]));
  for (const conflict of conflicts) merged.set(conflictKey(conflict.Resource, conflict.SyncId), SyncConflictSchema.parse(conflict));
  await writeConflicts([...merged.values()]);
}

export async function removeSyncConflict(resource: SyncResource, syncId: string): Promise<void> {
  await writeConflicts((await getSyncConflicts()).filter((item) => conflictKey(item.Resource, item.SyncId) !== conflictKey(resource, syncId)));
}

export async function keepLocalConflict(resource: SyncResource, syncId: string): Promise<void> {
  const conflicts = await getSyncConflicts();
  await writeConflicts(conflicts.map((item) =>
    conflictKey(item.Resource, item.SyncId) === conflictKey(resource, syncId) ? { ...item, KeepLocal: true } : item,
  ));
}

export async function applyServerConflict(conflict: SyncConflict): Promise<void> {
  const change = SyncPullChangeSchema.parse({
    Resource: conflict.Resource,
    SyncId: conflict.SyncId,
    Operation: 'U',
    Data: conflict.ServerData,
  });
  if (!change.Data) throw new Error('El servidor no devolvió una versión válida del registro.');

  const remoteRaw: DirtyRaw = { id: change.SyncId, ...change.Data };
  await database.write(async () => {
    const record = await database.get<EntityBaseModel>(change.Resource).find(change.SyncId);
    const prepared = record.prepareUpdate((model) => {
      for (const [field, value] of Object.entries(remoteRaw)) {
        if (field !== 'id') model._dangerouslySetRawWithoutMarkingColumnChange(field, value as never);
      }
      model._raw._status = 'synced';
      model._raw._changed = '';
    });
    await database.batch(prepared);
  }, 'resolve sync conflict with server version');
  await removeSyncConflict(conflict.Resource, conflict.SyncId);
}

export function conflictForChange(conflicts: SyncConflict[], change: SyncPushChange): SyncConflict | undefined {
  return conflicts.find((item) => item.Resource === change.Resource && item.SyncId === change.SyncId);
}

interface SyncConflictState {
  Conflicts: SyncConflict[];
  setConflicts: (conflicts: SyncConflict[]) => void;
}

export const useSyncConflictState = create<SyncConflictState>((set) => ({
  Conflicts: [],
  setConflicts: (Conflicts) => set({ Conflicts }),
}));
