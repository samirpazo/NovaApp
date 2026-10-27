import type { SyncPushChange, SyncPushResponse } from '@/contracts/sync';
import {
  MAX_SYNC_PUSH_BATCH_SIZE,
  classifyPushResults,
  orderAndChunkPushChanges,
  pushSequentially,
} from '@/sync/push-batches';

const definition = (index: number) =>
  ({
    Resource: 'GenDefinition',
    SyncId: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    Operation: 'C',
    SyncVersion: '',
    Force: false,
    Data: {
      SyncId: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      SyncVersion: '',
      SecStatus: true,
      CreateUserId: 1,
      UpdateUserId: 1,
      DeleteUserId: null,
      CreateDate: '2026-01-01T00:00:00Z',
      UpdateDate: null,
      DeleteDate: null,
      DefID: -index,
      DefDescription: `fake ${index}`,
      DefCode: `FAKE_${index}`,
      DefStated: 1,
    },
  }) as SyncPushChange;

test('splits 501 operations into ordered server-compatible batches', () => {
  const changes = Array.from({ length: 501 }, (_, index) =>
    definition(index + 1),
  );
  const batches = orderAndChunkPushChanges(changes);

  expect(batches.map((batch) => batch.length)).toEqual([500, 1]);
  expect(batches.flat()).toEqual(changes);
  expect(batches.every((batch) => batch.length <= MAX_SYNC_PUSH_BATCH_SIZE)).toBe(
    true,
  );
});

test('sends sequentially and leaves a failed batch plus later work pending', async () => {
  const changes = Array.from({ length: 501 }, (_, index) =>
    definition(index + 1),
  );
  const send = jest
    .fn<
      Promise<{ accepted: SyncPushChange[]; rejected: SyncPushChange[] }>,
      [SyncPushChange[]]
    >()
    .mockImplementationOnce(async (batch) => ({
      accepted: batch,
      rejected: [],
    }))
    .mockRejectedValueOnce(new Error('fake failure'));

  const result = await pushSequentially(changes, send);

  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([500, 1]);
  expect(result.accepted).toHaveLength(500);
  expect(result.rejected).toEqual([changes[500]]);
  expect(result.error).toEqual(new Error('fake failure'));
});

test('retains per-item rejection while acknowledging accepted items in a mixed response', async () => {
  const changes = [definition(1), definition(2), definition(3)];
  const result = await pushSequentially(changes, async () => ({
    accepted: [changes[0], changes[2]],
    rejected: [changes[1]],
  }));

  expect(result.accepted).toEqual([changes[0], changes[2]]);
  expect(result.rejected).toEqual([changes[1]]);
  expect(result.error).toEqual(
    new Error('Nova rechazó cambios del lote de sincronización.'),
  );
});

test('maps mixed server results to their exact changes', () => {
  const changes = [definition(1), definition(2)];
  const results = [
    {
      Resource: 'GenDefinition',
      SyncId: changes[0].SyncId,
      Status: 'Applied',
      Data: changes[0].Data,
    },
    {
      Resource: 'GenDefinition',
      SyncId: changes[1].SyncId,
      Status: 'Rejected',
      Message: 'fake rejection',
      Data: null,
    },
  ] as SyncPushResponse['Results'];

  const classified = classifyPushResults(changes, results);

  expect(classified.accepted).toEqual([changes[0]]);
  expect(classified.rejected).toEqual([changes[1]]);
  expect(classified.appliedResults).toEqual([results[0]]);
});
