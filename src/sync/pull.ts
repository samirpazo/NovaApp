import { localStorageKey, type DirtyRaw } from '@nozbe/watermelondb';
import {
  synchronize,
  type SyncDatabaseChangeSet,
  type SyncPushArgs,
  type SyncTableChangeSet,
} from '@nozbe/watermelondb/sync';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/auth/store';
import { createResponseApiSchema } from '@/contracts/api';
import {
  SYNC_RESOURCES,
  SYNC_ACCESS,
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
import {
  getActiveDatabase,
  getActiveIdentityKey,
  isActiveIdentity,
  type EntityBaseModel,
} from '@/database';
import { getApiErrorMessage, getForUser, postForUser } from '@/lib/api';
import { flushPendingAppearance } from '@/theme/appearance';
import {
  getSyncConnection,
  isConfiguredApiConnection,
  SyncConnectionSchema,
  type SyncConnection,
} from '@/sync/config';
import {
  conflictForChange,
  getSyncConflicts,
  removeSyncConflict,
  saveSyncConflicts,
} from '@/sync/conflicts';
import { type PullResult, useSyncState } from '@/sync/state';
import { classifySyncFailure, reportSyncTelemetry } from '@/sync/telemetry';
import { initialPullCursor } from '@/sync/pull-options';
import { activateSyncScope } from '@/sync/scope';
import { classifyPushResults, pushSequentially } from '@/sync/push-batches';
import {
  applyTechnicalVisitAcknowledgements,
  prepareTechnicalVisitMedia,
} from '@/sync/technical-visit-media';

const LAST_PULL_KEY = localStorageKey<PullResult>('nova.sync.lastPull');
const TECHNICAL_VISIT_BOOTSTRAP_SCOPE_KEY = localStorageKey<string>(
  'nova.sync.technicalVisitBootstrapScope.v4',
);
const MAX_PULL_PAGES = 10_000;

type MutableChangeSet = Record<SyncResource, SyncTableChangeSet>;

const emptyTableChanges = (): SyncTableChangeSet => ({
  created: [],
  updated: [],
  deleted: [],
});

function createChangeSet(): MutableChangeSet {
  return {
    [SYNC_RESOURCES.GenDefinition]: emptyTableChanges(),
    [SYNC_RESOURCES.GenDefinitionDetail]: emptyTableChanges(),
    [SYNC_RESOURCES.RstBranch]: emptyTableChanges(),
    [SYNC_RESOURCES.RstTable]: emptyTableChanges(),
    [SYNC_RESOURCES.OagTechnicalVisit]: emptyTableChanges(),
    [SYNC_RESOURCES.OagTechnicalVisitSchedule]: emptyTableChanges(),
    [SYNC_RESOURCES.GenCampaign]: emptyTableChanges(),
    [SYNC_RESOURCES.OagFruitFarm]: emptyTableChanges(),
    [SYNC_RESOURCES.OagPlotFarm]: emptyTableChanges(),
    [SYNC_RESOURCES.OagFruitFarmSupervisor]: emptyTableChanges(),
    [SYNC_RESOURCES.OagCultive]: emptyTableChanges(),
    [SYNC_RESOURCES.OagVariety]: emptyTableChanges(),
    [SYNC_RESOURCES.OagFarmSupplies]: emptyTableChanges(),
    [SYNC_RESOURCES.OagFarmSuppliesTarget]: emptyTableChanges(),
    [SYNC_RESOURCES.OagPlague]: emptyTableChanges(),
    [SYNC_RESOURCES.OagPlagueCultive]: emptyTableChanges(),
    [SYNC_RESOURCES.OagWaterSource]: emptyTableChanges(),
  };
}

function toRemoteRaw<TResource extends SyncResource>(
  entity: SyncEntityMap[TResource],
): DirtyRaw {
  return { id: entity.SyncId, ...entity };
}

function applyLatestChange(
  changes: MutableChangeSet,
  change: AnySyncPullChange,
): void {
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

function rawData(raw: DirtyRaw): Record<string, unknown> {
  const { id: _id, _status, _changed, ...data } = raw;
  return data;
}

function preservePendingSyncVersion(
  _table: string,
  local: DirtyRaw,
  _remote: DirtyRaw,
  resolved: DirtyRaw,
): DirtyRaw {
  if (local._status !== 'synced') resolved.SyncVersion = local.SyncVersion;
  return resolved;
}

function pushChangesFrom({ changes }: SyncPushArgs): SyncPushChange[] {
  const result: SyncPushChange[] = [];
  for (const resource of Object.values(SYNC_RESOURCES)) {
    const table = (
      changes as Partial<Record<SyncResource, SyncTableChangeSet>>
    )[resource];
    if (!table) continue;
    if (SYNC_ACCESS[resource] === 'ReadOnly') {
      if (
        table.created.length ||
        table.updated.length ||
        table.deleted.length
      ) {
        throw new Error(`${resource} es un recurso local de solo lectura.`);
      }
      continue;
    }
    for (const raw of table.created) {
      result.push(
        SyncPushChangeSchema.parse({
          Resource: resource,
          SyncId: String(raw.SyncId),
          Operation: 'C',
          SyncVersion: String(raw.SyncVersion || ''),
          Data: rawData(raw),
        }),
      );
    }
    for (const raw of table.updated) {
      result.push(
        SyncPushChangeSchema.parse({
          Resource: resource,
          SyncId: String(raw.SyncId),
          Operation: 'U',
          SyncVersion: String(raw.SyncVersion || ''),
          Data: rawData(raw),
        }),
      );
    }
    for (const SyncId of table.deleted) {
      result.push(
        SyncPushChangeSchema.parse({
          Resource: resource,
          SyncId,
          Operation: 'D',
          Data: null,
        }),
      );
    }
  }
  return result;
}

async function removeReconciledDuplicates(database: ReturnType<typeof getActiveDatabase>): Promise<void> {
  await database.write(async () => {
    const duplicates = [];
    for (const resource of Object.values(SYNC_RESOURCES)) {
      const records = await database
        .get<EntityBaseModel>(resource)
        .query()
        .fetch();
      const canonicalIds = new Set(
        records
          .filter((record) => record.id === record.SyncId)
          .map((record) => record.SyncId),
      );
      duplicates.push(
        ...records
          .filter(
            (record) =>
              record.syncStatus === 'synced' &&
              record.id !== record.SyncId &&
              canonicalIds.has(record.SyncId),
          )
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

const activePulls = new Map<string, Promise<PullResult>>();

export function pullNova(options: PullNovaOptions = {}): Promise<PullResult> {
  const database = getActiveDatabase();
  const identityKey = getActiveIdentityKey();
  const expectedUserId = useAuthStore.getState().Session?.User.UsrID;
  if (!identityKey) throw new Error('No hay una cuenta activa para sincronizar.');
  if (!expectedUserId) throw new Error('Debe iniciar sesión antes de sincronizar.');
  const activePull = activePulls.get(identityKey);
  if (activePull) return activePull;
  const nextPull = executePull(options, database, identityKey, expectedUserId).finally(() => {
    if (activePulls.get(identityKey) === nextPull) activePulls.delete(identityKey);
  });
  activePulls.set(identityKey, nextPull);
  return nextPull;
}

async function executePull(
  options: PullNovaOptions,
  database: ReturnType<typeof getActiveDatabase>,
  identityKey: string,
  expectedUserId: number,
): Promise<PullResult> {
  const startedAt = Date.now();
  const state = useSyncState.getState();
  if (isActiveIdentity(identityKey)) state.startPull();

  try {
    const storedConnection = options.connection ?? (await getSyncConnection());
    if (!storedConnection)
      throw new Error(
        'Debe configurar el servidor y la sucursal antes de sincronizar.',
      );
    const connection = SyncConnectionSchema.parse(storedConnection);
    if (!isConfiguredApiConnection(connection))
      throw new Error(
        'La conexión guardada no coincide con el servidor configurado en esta app.',
      );
    await useAuthStore.getState().ensureOnlineSession();
    const session = useAuthStore.getState().Session;
    const userId = session?.User.UsrID;
    if (!userId || userId !== expectedUserId || !isActiveIdentity(identityKey))
      throw new Error('La sesión cambió antes de iniciar la sincronización.');
    const personId = session.User.PrsID ?? 0;
    const activeScope = await activateSyncScope(
      database,
      connection,
      userId,
      personId,
      () =>
        useAuthStore.getState().Session?.User.UsrID === userId &&
        isActiveIdentity(identityKey),
    );
    if (
      !activeScope.ready ||
      useAuthStore.getState().Session?.User.UsrID !== userId
    )
      throw new Error(
        'No se pudo activar el alcance de sincronización de la cuenta.',
      );

    // User appearance is a last-value singleton, not a WatermelonDB journal entity.
    // Flush its offline queue alongside the regular manual synchronization.
    await flushPendingAppearance(userId, identityKey);

    const currentScope = activeScope.scope;
    const bootstrapScope = await database.localStorage.get(
      TECHNICAL_VISIT_BOOTSTRAP_SCOPE_KEY,
    );
    const bootstrapTechnicalVisits = bootstrapScope !== currentScope;
    const limit = Math.min(500, Math.max(1, options.limit ?? 250));
    let downloaded = 0;
    let uploaded = 0;
    let pages = 0;
    let finalCursor = 0;
    let bootstrapRequested =
      (options.forceBootstrap ?? false) || bootstrapTechnicalVisits;
    const acknowledgedTechnicalVisits: {
      SyncId: string;
      ExpectedSyncVersion: string;
      Data: SyncEntityMap['OagTechnicalVisit'];
    }[] = [];
    let pushFailure: unknown | null = null;

    const pullChanges = async ({ lastPulledAt }: { lastPulledAt?: number }) => {
      const changes = createChangeSet();
      let cursor = initialPullCursor(lastPulledAt, bootstrapRequested);
      bootstrapRequested = false;
      let hasMore: boolean;

      do {
        if (
          !isActiveIdentity(identityKey) ||
          useAuthStore.getState().Session?.User.UsrID !== userId
        )
          throw new Error('La cuenta cambió durante la sincronización.');
        if (++pages > MAX_PULL_PAGES)
          throw new Error(
            'Nova devolvió demasiadas páginas de sincronización.',
          );
        const response = await getForUser('/sync/pull', userId, {
          params: {
            limit,
            ...(connection.BranchId === undefined
              ? {}
              : { branchId: connection.BranchId }),
            ...(cursor === undefined ? {} : { cursor }),
          },
          signal: options.signal,
        }, identityKey);
        const envelope = createResponseApiSchema(SyncPullResponseSchema).parse(
          response.data,
        );
        if (
          !isActiveIdentity(identityKey) ||
          useAuthStore.getState().Session?.User.UsrID !== userId
        )
          throw new Error('La cuenta cambió durante la sincronización.');
        if (!envelope.Succeeded || !envelope.Data) {
          throw new Error(
            envelope.Message || 'Nova no devolvió datos de sincronización.',
          );
        }

        for (const change of envelope.Data.Changes)
          applyLatestChange(changes, change);
        downloaded += envelope.Data.Changes.length;
        finalCursor = envelope.Data.Cursor;
        cursor = envelope.Data.Cursor;
        hasMore = envelope.Data.HasMore;
      } while (hasMore);

      // WatermelonDB treats 0 as "never synchronized". Offset the backend cursor by one.
      return {
        changes: changes as SyncDatabaseChangeSet,
        timestamp: finalCursor + 1,
      };
    };

    const pushChanges = async (args: SyncPushArgs) => {
      if (
        !isActiveIdentity(identityKey) ||
        useAuthStore.getState().Session?.User.UsrID !== userId
      )
        throw new Error('La cuenta cambió durante la sincronización.');
      const pendingChanges = pushChangesFrom(args);
      const storedConflicts = await getSyncConflicts(database);
      const rejectedIds: Partial<Record<SyncResource, string[]>> = {};
      const changes = pendingChanges.flatMap((change) => {
        const conflict = conflictForChange(storedConflicts, change);
        if (!conflict) return [change];
        if (conflict.KeepLocal) return [{ ...change, Force: true }];
        (rejectedIds[change.Resource] ??= []).push(change.SyncId);
        return [];
      });
      if (!changes.length)
        return Object.keys(rejectedIds).length
          ? { experimentalRejectedIds: rejectedIds }
          : undefined;
      const result = await pushSequentially(changes, async (batch) => {
          await prepareTechnicalVisitMedia(batch, userId, database, identityKey);
        const serialized = JSON.stringify(batch);
        const idempotencyKey = `nova-sync-${await digestStringAsync(CryptoDigestAlgorithm.SHA256, serialized)}`;
        try {
          const response = await postForUser(
            '/sync/push',
            { BranchId: connection.BranchId, Changes: batch },
            userId,
            {
              headers: { 'Idempotency-Key': idempotencyKey },
              signal: options.signal,
            },
            identityKey,
          );
          const envelope = createResponseApiSchema(
            SyncPushResponseSchema,
          ).parse(response.data);
          if (
            !isActiveIdentity(identityKey) ||
            useAuthStore.getState().Session?.User.UsrID !== userId
          )
            throw new Error('La cuenta cambió durante la sincronización.');
          if (!envelope.Succeeded || !envelope.Data)
            throw new Error(envelope.Message || 'Nova no confirmó el Push.');
          const classified = classifyPushResults(batch, envelope.Data.Results);

          for (const responseResult of classified.appliedResults) {
            if (responseResult.Resource !== SYNC_RESOURCES.OagTechnicalVisit)
              continue;
            const pushedChange = batch.find(
              (change) =>
                change.Resource === responseResult.Resource &&
                change.SyncId === responseResult.SyncId,
            );
            if (!pushedChange || !responseResult.Data) continue;
            acknowledgedTechnicalVisits.push({
              SyncId: responseResult.SyncId,
              ExpectedSyncVersion: pushedChange.SyncVersion ?? '',
              Data: responseResult.Data,
            });
          }
          for (const acceptedChange of classified.accepted) {
            const conflict = conflictForChange(storedConflicts, {
              Resource: acceptedChange.Resource,
              SyncId: acceptedChange.SyncId,
            } as SyncPushChange);
            if (conflict?.KeepLocal)
              await removeSyncConflict(
                acceptedChange.Resource,
                acceptedChange.SyncId,
                database,
              );
          }
          return {
            accepted: classified.accepted,
            rejected: classified.rejected,
          };
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 409) {
            const envelope = createResponseApiSchema(
              SyncPushResponseSchema,
            ).safeParse(error.response.data);
            if (envelope.success && envelope.data.Data) {
              const detected = envelope.data.Data.Results.flatMap<SyncConflict>(
                (responseResult) => {
                  if (
                    responseResult.Status !== 'Conflict' ||
                    !responseResult.Data ||
                    responseResult.Resource === SYNC_RESOURCES.RstTable
                  )
                    return [];
                  const local = batch.find(
                    (change) =>
                      change.Resource === responseResult.Resource &&
                      change.SyncId === responseResult.SyncId,
                  );
                  const conflict = SyncConflictSchema.safeParse({
                    Resource: responseResult.Resource,
                    SyncId: responseResult.SyncId,
                    Operation: local?.Operation ?? 'U',
                    Message:
                      responseResult.Message ||
                      'El registro cambió también en el servidor.',
                    LocalData: local?.Data ?? null,
                    ServerData: responseResult.Data,
                    KeepLocal: false,
                    DetectedAt: new Date().toISOString(),
                  });
                  return conflict.success ? [conflict.data] : [];
                },
              );
              if (detected.length) {
                await saveSyncConflicts(detected, database);
                throw new Error(
                  `Se detectaron ${detected.length} conflicto${detected.length === 1 ? '' : 's'} pendiente${detected.length === 1 ? '' : 's'} de resolución.`,
                );
              }
            }
          }
          throw error;
        }
      });

      uploaded += result.accepted.length;
      pushFailure = result.error;
      for (const change of result.rejected)
        (rejectedIds[change.Resource] ??= []).push(change.SyncId);
      if (Object.keys(rejectedIds).length)
        return { experimentalRejectedIds: rejectedIds };
      return undefined;
    };

    await synchronize({
      database,
      sendCreatedAsUpdated: true,
      conflictResolver: preservePendingSyncVersion,
      pullChanges,
      pushChanges,
    });
    await applyTechnicalVisitAcknowledgements(acknowledgedTechnicalVisits, database);
    await database.localStorage.set(
      TECHNICAL_VISIT_BOOTSTRAP_SCOPE_KEY,
      currentScope,
    );

    // The server owns numeric IDs and rowversions. A second Pull reconciles those
    // fields after WatermelonDB has marked the accepted local batch as synced.
    if (uploaded > 0) {
      await synchronize({
        database,
        sendCreatedAsUpdated: true,
        conflictResolver: preservePendingSyncVersion,
        pullChanges,
      });
    }
    await removeReconciledDuplicates(database);
    if (pushFailure) throw pushFailure;

    const result: PullResult = {
      Cursor: finalCursor,
      Downloaded: downloaded,
      Uploaded: uploaded,
      Pages: pages,
      DurationMs: Date.now() - startedAt,
      FinishedAt: new Date().toISOString(),
    };
    await database.localStorage.set(LAST_PULL_KEY, result);
    if (isActiveIdentity(identityKey)) useSyncState.getState().completePull(result);
    reportSyncTelemetry({
      event: 'sync_completed',
      durationMs: result.DurationMs,
      downloaded,
      uploaded,
      pages,
    });
    return result;
  } catch (error) {
    const message = getApiErrorMessage(error);
    if (isActiveIdentity(identityKey)) useSyncState.getState().failPull(message);
    reportSyncTelemetry({
      event: 'sync_failed',
      durationMs: Date.now() - startedAt,
      failureKind: classifySyncFailure(message),
    });
    throw new Error(message, { cause: error });
  }
}

export async function getLastPull(): Promise<PullResult | null> {
  return (await getActiveDatabase().localStorage.get(LAST_PULL_KEY)) ?? null;
}
