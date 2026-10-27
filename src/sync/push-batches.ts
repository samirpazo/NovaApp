import {
  SYNC_RESOURCES,
  type SyncPushChange,
  type SyncPushResponse,
} from '@/contracts/sync';

export const MAX_SYNC_PUSH_BATCH_SIZE = 500;

export function classifyPushResults(
  changes: SyncPushChange[],
  results: SyncPushResponse['Results'],
): {
  accepted: SyncPushChange[];
  rejected: SyncPushChange[];
  appliedResults: SyncPushResponse['Results'];
} {
  if (results.length !== changes.length)
    throw new Error('Nova no confirmó todos los cambios del lote.');
  const pending = new Map(
    changes.map((change) => [
      `${change.Resource}:${change.SyncId}`,
      change,
    ]),
  );
  const accepted: SyncPushChange[] = [];
  const rejected: SyncPushChange[] = [];
  const appliedResults: SyncPushResponse['Results'] = [];
  for (const result of results) {
    const key = `${result.Resource}:${result.SyncId}`;
    const change = pending.get(key);
    if (!change)
      throw new Error('Nova devolvió confirmaciones duplicadas o inesperadas.');
    if (
      result.Status === 'Applied' &&
      result.Resource === SYNC_RESOURCES.OagTechnicalVisit &&
      !result.Data
    ) {
      rejected.push(change);
    } else if (result.Status === 'Applied') {
      accepted.push(change);
      appliedResults.push(result);
    } else {
      rejected.push(change);
    }
    pending.delete(key);
  }
  if (pending.size)
    throw new Error('Nova devolvió confirmaciones incompletas para el lote.');
  return { accepted, rejected, appliedResults };
}

const resourceOrder: Partial<Record<SyncPushChange['Resource'], number>> = {
  [SYNC_RESOURCES.GenDefinition]: 0,
  [SYNC_RESOURCES.GenDefinitionDetail]: 1,
  [SYNC_RESOURCES.RstBranch]: 2,
  [SYNC_RESOURCES.OagTechnicalVisitSchedule]: 3,
  [SYNC_RESOURCES.OagTechnicalVisit]: 4,
};

export function orderAndChunkPushChanges(
  changes: SyncPushChange[],
  limit = MAX_SYNC_PUSH_BATCH_SIZE,
): SyncPushChange[][] {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SYNC_PUSH_BATCH_SIZE)
    throw new Error('El tamaño del lote Push debe estar entre 1 y 500.');

  const ordered = changes
    .map((change, index) => ({ change, index }))
    .sort(
      (left, right) =>
        (resourceOrder[left.change.Resource] ?? Number.MAX_SAFE_INTEGER) -
          (resourceOrder[right.change.Resource] ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index,
    )
    .map(({ change }) => change);
  const chunks: SyncPushChange[][] = [];
  for (let index = 0; index < ordered.length; index += limit)
    chunks.push(ordered.slice(index, index + limit));
  return chunks;
}

export async function pushSequentially(
  changes: SyncPushChange[],
  send: (
    chunk: SyncPushChange[],
  ) => Promise<{ accepted: SyncPushChange[]; rejected: SyncPushChange[] }>,
  limit = MAX_SYNC_PUSH_BATCH_SIZE,
): Promise<{
  accepted: SyncPushChange[];
  rejected: SyncPushChange[];
  error: unknown | null;
}> {
  const chunks = orderAndChunkPushChanges(changes, limit);
  const accepted: SyncPushChange[] = [];
  for (let index = 0; index < chunks.length; index++) {
    try {
      const result = await send(chunks[index]);
      accepted.push(...result.accepted);
      if (result.rejected.length)
        return {
          accepted,
          rejected: [
            ...result.rejected,
            ...chunks.slice(index + 1).flat(),
          ],
          error: new Error('Nova rechazó cambios del lote de sincronización.'),
        };
    } catch (error) {
      return {
        accepted,
        rejected: chunks.slice(index).flat(),
        error,
      };
    }
  }
  return { accepted, rejected: [], error: null };
}
