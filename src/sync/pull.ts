import { localStorageKey, type DirtyRaw } from '@nozbe/watermelondb';
import { synchronize, type SyncDatabaseChangeSet, type SyncTableChangeSet } from '@nozbe/watermelondb/sync';

import { ensureOnlineSession } from '@/auth/service';
import { createResponseApiSchema } from '@/contracts/api';
import {
  SYNC_RESOURCES,
  SyncPullResponseSchema,
  type AnySyncPullChange,
  type SyncEntityMap,
  type SyncResource,
} from '@/contracts/sync';
import { database } from '@/database';
import { createApiClient, getApiErrorMessage } from '@/lib/api';
import { getSyncConnection, SyncConnectionSchema, type SyncConnection } from '@/sync/config';
import { type PullResult, useSyncState } from '@/sync/state';

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

async function prepareScope(connection: SyncConnection): Promise<void> {
  const nextScope = scopeFor(connection);
  const activeScope = await database.localStorage.get(ACTIVE_SCOPE_KEY);
  if (activeScope && activeScope !== nextScope) {
    await database.write(() => database.unsafeResetDatabase(), 'change sync scope');
  }
  await database.localStorage.set(ACTIVE_SCOPE_KEY, nextScope);
}

export interface PullNovaOptions {
  connection?: SyncConnection;
  accessToken?: string;
  signal?: AbortSignal;
  limit?: number;
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
  const state = useSyncState.getState();
  state.startPull();

  try {
    const storedConnection = options.connection ?? (await getSyncConnection());
    if (!storedConnection) throw new Error('Debe configurar el servidor y la sucursal antes de sincronizar.');
    const connection = SyncConnectionSchema.parse(storedConnection);
    const accessToken = options.accessToken?.trim() || (await ensureOnlineSession(connection.BaseUrl));

    await prepareScope(connection);
    const api = createApiClient({ baseUrl: connection.BaseUrl, accessToken });
    const limit = Math.min(500, Math.max(1, options.limit ?? 250));
    let downloaded = 0;
    let pages = 0;
    let finalCursor = 0;

    await synchronize({
      database,
      sendCreatedAsUpdated: true,
      pullChanges: async ({ lastPulledAt }) => {
        const changes = createChangeSet();
        let cursor = lastPulledAt === undefined ? undefined : lastPulledAt - 1;
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
      },
    });

    const result: PullResult = {
      Cursor: finalCursor,
      Downloaded: downloaded,
      Pages: pages,
      FinishedAt: new Date().toISOString(),
    };
    await database.localStorage.set(LAST_PULL_KEY, result);
    useSyncState.getState().completePull(result);
    return result;
  } catch (error) {
    const message = getApiErrorMessage(error);
    useSyncState.getState().failPull(message);
    throw new Error(message, { cause: error });
  }
}

export async function getLastPull(): Promise<PullResult | null> {
  return (await database.localStorage.get(LAST_PULL_KEY)) ?? null;
}
