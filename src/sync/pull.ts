import { localStorageKey, type DirtyRaw } from '@nozbe/watermelondb';
import { synchronize, type SyncDatabaseChangeSet, type SyncPushArgs, type SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { isAxiosError } from 'axios';

import { ensureOnlineSession } from '@/auth/service';
import { createResponseApiSchema } from '@/contracts/api';
import {
  SYNC_RESOURCES,
  SyncPullResponseSchema,
  SyncPushChangeSchema,
  SyncConflictSchema,
  SyncPushResponseSchema,
  type AnySyncPullChange,
  type SyncEntityMap,
  type SyncPushChange,
  type SyncConflict,
  type SyncResource,
} from '@/contracts/sync';
import { database, type EntityBaseModel } from '@/database';
import { api, getApiErrorMessage } from '@/lib/api';
import { flushPendingAppearance } from '@/theme/appearance';
import { getSyncConnection, SyncConnectionSchema, type SyncConnection } from '@/sync/config';
import { conflictForChange, getSyncConflicts, removeSyncConflict, saveSyncConflicts } from '@/sync/conflicts';
import { type PullResult, useSyncState } from '@/sync/state';
import { classifySyncFailure, reportSyncTelemetry } from '@/sync/telemetry';
import { initialPullCursor } from '@/sync/pull-options';

const ACTIVE_SCOPE_KEY = localStorageKey<string>('nova.sync.activeScope');
const LAST_PULL_KEY = localStorageKey<PullResult>('nova.sync.lastPull');
const MAX_PULL_PAGES = 10_000;

type MutableChangeSet = Record<SyncResource, SyncTableChangeSet>;

const emptyTableChanges = (): SyncTableChangeSet => ({ created: [], updated: [], deleted: [] });

function createChangeSet(): MutableChangeSet {
  return {
    [SYNC_RESOURCES.GenDefinition]: emptyTableChanges(),
    [SYNC_RESOURCES.GenDefinitionDetail]: emptyTableChanges(),
    [SYNC_RESOURCES.RstBranch]: emptyTableChanges(),
    [SYNC_RESOURCES.RstTable]: emptyTableChanges(),
  };
}

function toRemoteRaw<TResource extends SyncResource>(entity: SyncEntityMap[TResource]): DirtyRaw {
  return { id: entity.SyncId, ...entity };
}

function applyLatestChange(changes: MutableChangeSet, change: AnySyncPullChange): void {
  const table = changes[change.Resource];
  table.updated = table.updated.filter((record) => record.id !== change.SyncId);
  table.deleted = table.deleted.filter((id) => id !== change.SyncId);

  if (change.Operation === 'D' || !change.Data) {
    table.deleted.push(change.SyncId);
    return;
  }

  // All remote records are sent as updated. WatermelonDB creates them when absent and
  // preserves locally changed columns when a future Pull meets pending local edits.
  table.updated.push(toRemoteRaw(change.Data));
}

function scopeFor(connection: SyncConnection): string {
  return `${connection.BaseUrl.replace(/\/+$/, '').toLowerCase()}|${connection.BranchId ?? 'general'}`;
}

function rawData(raw: DirtyRaw): Record<string, unknown> {
  const { id: _id, _status, _changed, ...data } = raw;
  return data;
}

function preservePendingSyncVersion(_table: string, local: DirtyRaw, _remote: DirtyRaw, resolved: DirtyRaw): DirtyRaw {
  if (local._status !== 'synced') resolved.SyncVersion = local.SyncVersion;
  return resolved;
}

function pushChangesFrom({ changes }: SyncPushArgs): SyncPushChange[] {
  const result: SyncPushChange[] = [];
  for (const resource of Object.values(SYNC_RESOURCES)) {
    const table = (changes as Partial<Record<SyncResource, SyncTableChangeSet>>)[resource];
    if (!table) continue;
    if (resource === SYNC_RESOURCES.RstTable) {
      if (table.created.length || table.updated.length || table.deleted.length) {
        throw new Error(`${resource} es un recurso local de solo lectura.`);
      }
      continue;
    }
    for (const raw of table.created) {
      result.push(SyncPushChangeSchema.parse({ Resource: resource, SyncId: String(raw.SyncId), Operation: 'C', SyncVersion: String(raw.SyncVersion || ''), Data: rawData(raw) }));
    }
    for (const raw of table.updated) {
      result.push(SyncPushChangeSchema.parse({ Resource: resource, SyncId: String(raw.SyncId), Operation: 'U', SyncVersion: String(raw.SyncVersion || ''), Data: rawData(raw) }));
    }
    for (const SyncId of table.deleted) {
      result.push(SyncPushChangeSchema.parse({ Resource: resource, SyncId, Operation: 'D', Data: null }));
    }
  }
  return result;
}

async function prepareScope(connection: SyncConnection): Promise<void> {
  const nextScope = scopeFor(connection);
  const activeScope = await database.localStorage.get(ACTIVE_SCOPE_KEY);
  if (activeScope && activeScope !== nextScope) {
    await database.write(() => database.unsafeResetDatabase(), 'change sync scope');
  }
  await database.localStorage.set(ACTIVE_SCOPE_KEY, nextScope);
}

async function removeReconciledDuplicates(): Promise<void> {
  await database.write(async () => {
    const duplicates = [];
    for (const resource of Object.values(SYNC_RESOURCES)) {
      const records = await database.get<EntityBaseModel>(resource).query().fetch();
      const canonicalIds = new Set(records.filter((record) => record.id === record.SyncId).map((record) => record.SyncId));
      duplicates.push(
        ...records
          .filter((record) => record.syncStatus === 'synced' && record.id !== record.SyncId && canonicalIds.has(record.SyncId))
          .map((record) => record.prepareDestroyPermanently()),
      );
    }
    if (duplicates.length) await database.batch(duplicates);
  }, 'remove reconciled sync duplicates');
}

export interface PullNovaOptions {
  connection?: SyncConnection;
  signal?: AbortSignal;
  limit?: number;
  /** Requests NovaApi's bootstrap snapshot without deleting local pending changes. */
  forceBootstrap?: boolean;
}

let activePull: Promise<PullResult> | null = null;

export function pullNova(options: PullNovaOptions = {}): Promise<PullResult> {
  if (activePull) return activePull;
  activePull = executePull(options).finally(() => {
    activePull = null;
  });
  return activePull;
}

async function executePull(options: PullNovaOptions): Promise<PullResult> {
  const startedAt = Date.now();
  const state = useSyncState.getState();
  state.startPull();

  try {
    const storedConnection = options.connection ?? (await getSyncConnection());
    if (!storedConnection) throw new Error('Debe configurar el servidor y la sucursal antes de sincronizar.');
    const connection = SyncConnectionSchema.parse(storedConnection);
    await ensureOnlineSession();

    // User appearance is a last-value singleton, not a WatermelonDB journal entity.
    // Flush its offline queue alongside the regular manual synchronization.
    await flushPendingAppearance();

    await prepareScope(connection);
    const limit = Math.min(500, Math.max(1, options.limit ?? 250));
    let downloaded = 0;
    let uploaded = 0;
    let pages = 0;
    let finalCursor = 0;
    let bootstrapRequested = options.forceBootstrap ?? false;

    const pullChanges = async ({ lastPulledAt }: { lastPulledAt?: number }) => {
        const changes = createChangeSet();
        let cursor = initialPullCursor(lastPulledAt, bootstrapRequested);
        bootstrapRequested = false;
        let hasMore: boolean;

        do {
          if (++pages > MAX_PULL_PAGES) throw new Error('Nova devolvió demasiadas páginas de sincronización.');
          const response = await api.get('/sync/pull', {
            params: {
              limit,
              ...(connection.BranchId === undefined ? {} : { branchId: connection.BranchId }),
              ...(cursor === undefined ? {} : { cursor }),
            },
            signal: options.signal,
          });
          const envelope = createResponseApiSchema(SyncPullResponseSchema).parse(response.data);
          if (!envelope.Succeeded || !envelope.Data) {
            throw new Error(envelope.Message || 'Nova no devolvió datos de sincronización.');
          }

          for (const change of envelope.Data.Changes) applyLatestChange(changes, change);
          downloaded += envelope.Data.Changes.length;
          finalCursor = envelope.Data.Cursor;
          cursor = envelope.Data.Cursor;
          hasMore = envelope.Data.HasMore;
        } while (hasMore);

        // WatermelonDB treats 0 as "never synchronized". Offset the backend cursor by one.
        return { changes: changes as SyncDatabaseChangeSet, timestamp: finalCursor + 1 };
    };

    const pushChanges = async (args: SyncPushArgs) => {
      const pendingChanges = pushChangesFrom(args);
      const storedConflicts = await getSyncConflicts();
      const rejectedIds: Partial<Record<SyncResource, string[]>> = {};
      const changes = pendingChanges.flatMap((change) => {
        const conflict = conflictForChange(storedConflicts, change);
        if (!conflict) return [change];
        if (conflict.KeepLocal) return [{ ...change, Force: true }];
        (rejectedIds[change.Resource] ??= []).push(change.SyncId);
        return [];
      });
      if (!changes.length) return Object.keys(rejectedIds).length ? { experimentalRejectedIds: rejectedIds } : undefined;
      if (changes.length > 500) throw new Error('Hay más de 500 cambios pendientes. Sincronice en lotes más pequeños.');
      const serialized = JSON.stringify(changes);
      const idempotencyKey = `nova-sync-${await digestStringAsync(CryptoDigestAlgorithm.SHA256, serialized)}`;
      try {
        const response = await api.post(
          '/sync/push',
          { BranchId: connection.BranchId, Changes: changes },
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
            signal: options.signal,
          },
        );
        const envelope = createResponseApiSchema(SyncPushResponseSchema).parse(response.data);
        if (!envelope.Succeeded || !envelope.Data) throw new Error(envelope.Message || 'Nova no confirmó el Push.');
        const failed = envelope.Data.Results.find((result) => result.Status !== 'Applied');
        if (failed) throw new Error(failed.Message || `No se pudo sincronizar ${failed.Resource}.`);
        for (const result of envelope.Data.Results) {
          const conflict = conflictForChange(storedConflicts, { Resource: result.Resource, SyncId: result.SyncId } as SyncPushChange);
          if (conflict?.KeepLocal) await removeSyncConflict(result.Resource, result.SyncId);
        }
        uploaded += changes.length;
        return Object.keys(rejectedIds).length ? { experimentalRejectedIds: rejectedIds } : undefined;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 409) {
          const envelope = createResponseApiSchema(SyncPushResponseSchema).safeParse(error.response.data);
          if (envelope.success && envelope.data.Data) {
            const detected = envelope.data.Data.Results.flatMap<SyncConflict>((result) => {
              if (result.Status !== 'Conflict' || !result.Data || result.Resource === SYNC_RESOURCES.RstTable) return [];
              const local = changes.find((change) => change.Resource === result.Resource && change.SyncId === result.SyncId);
              const conflict = SyncConflictSchema.safeParse({
                Resource: result.Resource,
                SyncId: result.SyncId,
                Operation: local?.Operation ?? 'U',
                Message: result.Message || 'El registro cambió también en el servidor.',
                LocalData: local?.Data ?? null,
                ServerData: result.Data,
                KeepLocal: false,
                DetectedAt: new Date().toISOString(),
              });
              return conflict.success ? [conflict.data] : [];
            });
            if (detected.length) {
              await saveSyncConflicts(detected);
              throw new Error(`Se detectaron ${detected.length} conflicto${detected.length === 1 ? '' : 's'} pendiente${detected.length === 1 ? '' : 's'} de resolución.`);
            }
          }
        }
        throw error;
      }
    };

    await synchronize({
      database,
      sendCreatedAsUpdated: true,
      conflictResolver: preservePendingSyncVersion,
      pullChanges,
      pushChanges,
    });

    // The server owns numeric IDs and rowversions. A second Pull reconciles those
    // fields after WatermelonDB has marked the accepted local batch as synced.
    if (uploaded > 0) {
      await synchronize({ database, sendCreatedAsUpdated: true, conflictResolver: preservePendingSyncVersion, pullChanges });
    }
    await removeReconciledDuplicates();

    const result: PullResult = {
      Cursor: finalCursor,
      Downloaded: downloaded,
      Uploaded: uploaded,
      Pages: pages,
      DurationMs: Date.now() - startedAt,
      FinishedAt: new Date().toISOString(),
    };
    await database.localStorage.set(LAST_PULL_KEY, result);
    useSyncState.getState().completePull(result);
    reportSyncTelemetry({ event: 'sync_completed', durationMs: result.DurationMs, downloaded, uploaded, pages });
    return result;
  } catch (error) {
    const message = getApiErrorMessage(error);
    useSyncState.getState().failPull(message);
    reportSyncTelemetry({ event: 'sync_failed', durationMs: Date.now() - startedAt, failureKind: classifySyncFailure(message) });
    throw new Error(message, { cause: error });
  }
}

export async function getLastPull(): Promise<PullResult | null> {
  return (await database.localStorage.get(LAST_PULL_KEY)) ?? null;
}
