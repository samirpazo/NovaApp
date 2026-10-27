import {
  applyTechnicalVisitAcknowledgements,
  prepareTechnicalVisitMedia,
} from '@/sync/technical-visit-media';
import { uploadManagedFile } from '@/lib/fileService';
import { database } from '@/database';
import { SYNC_RESOURCES, type SyncPushChange } from '@/contracts/sync';
import type { OagTechnicalVisit } from '@/contracts/entities/operationsagr';

jest.mock('@/lib/fileService', () => ({ uploadManagedFile: jest.fn() }));
jest.mock('@/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((work: () => Promise<void>) => work()),
    batch: jest.fn(),
  },
}));

const syncId = '330c90ee-184c-42e5-9fb7-93f177901c20';

type TestRecord = {
  SyncVersion: string;
  SecStatus: boolean;
  CreateUserId: number;
  UpdateUserId: number | null;
  DeleteUserId: number | null;
  CreateDate: string;
  UpdateDate: string | null;
  DeleteDate: string | null;
  TviID: number;
  TvsID: number;
  TviPerformedDate: string;
  TviDocumentSeries: string;
  TviDocumentNumber: number;
  TviLatitude: number | null;
  TviLongitude: number | null;
  TviObservation: string | null;
  TviSignatureFilID: number | null;
  Snapshot: string;
  _raw: { _status: string; _changed: string };
  _dangerouslySetRawWithoutMarkingColumnChange(
    field: string,
    value: unknown,
  ): void;
  prepareUpdate(update: (model: TestRecord) => void): TestRecord;
};

test('signature media is prepared for push without mutating the fetched local record', async () => {
  const pendingSignature = {
    uri: '/local/signature.png',
    name: 'firma-productor.png',
    mimeType: 'image/png',
  };
  const snapshot = {
    Visit: { TviSignatureFilID: null },
    Evidences: [],
    PendingSignatureFile: pendingSignature,
  };
  const record: TestRecord = {
    SyncVersion: 'old-version',
    SecStatus: true,
    CreateUserId: 1,
    UpdateUserId: 1,
    DeleteUserId: null,
    CreateDate: '2026-10-24T17:28:35.701891Z',
    UpdateDate: '2026-10-26T23:31:21.688Z',
    DeleteDate: null,
    TviID: 1,
    TvsID: 1,
    TviPerformedDate: '2026-10-24T17:23:06.608Z',
    TviDocumentSeries: '1',
    TviDocumentNumber: 2,
    TviLatitude: -5.3817468,
    TviLongitude: -80.7381973,
    TviObservation: 'Observación',
    TviSignatureFilID: null as number | null,
    Snapshot: JSON.stringify(snapshot),
    _raw: { _status: 'updated', _changed: 'Snapshot,TviSignatureFilID' },
    _dangerouslySetRawWithoutMarkingColumnChange(field: string, value: unknown) {
      if (field === 'Snapshot') this.Snapshot = String(value);
      if (field === 'TviSignatureFilID') this.TviSignatureFilID = Number(value);
    },
    prepareUpdate(update) {
      update(this);
      return this;
    },
  };
  jest.mocked(database.get).mockReturnValue({
    query: () => ({ fetch: async () => [record] }),
  } as never);
  jest.mocked(uploadManagedFile).mockResolvedValue({
    FileId: 165,
    OriginalName: pendingSignature.name,
    MimeType: pendingSignature.mimeType,
    Size: 100,
    PreviewStatus: 'Ready',
    CanDownload: true,
  });

  const change = {
    Resource: SYNC_RESOURCES.OagTechnicalVisit,
    SyncId: syncId,
    Operation: 'U',
    Data: {
      TviSignatureFilID: null,
      Snapshot: JSON.stringify(snapshot),
    },
  } as unknown as SyncPushChange;

  await prepareTechnicalVisitMedia([change]);

  expect(uploadManagedFile).toHaveBeenCalledTimes(1);
  expect(
    (
      change.Data as
        | { TviSignatureFilID?: number | null }
        | undefined
    )?.TviSignatureFilID,
  ).toBe(165);
  expect(record.TviSignatureFilID).toBeNull();
  expect(JSON.parse(record.Snapshot)).toHaveProperty('PendingSignatureFile');
  expect(record._raw._status).toBe('updated');
  expect(record._raw._changed).toBe('Snapshot,TviSignatureFilID');
  expect(uploadManagedFile).toHaveBeenCalledTimes(1);
});

test('applied server response refreshes the local aggregate versions and snapshot', async () => {
  const record: TestRecord = {
    SyncVersion: 'client-version',
    SecStatus: true,
    CreateUserId: 1,
    UpdateUserId: 1,
    DeleteUserId: null,
    CreateDate: '2026-10-24T17:28:35.701891Z',
    UpdateDate: '2026-10-26T23:31:21.688Z',
    DeleteDate: null,
    TviID: 1,
    TvsID: 1,
    TviPerformedDate: '2026-10-24T17:23:06.608Z',
    TviDocumentSeries: '1',
    TviDocumentNumber: 2,
    TviLatitude: -5.3817468,
    TviLongitude: -80.7381973,
    TviObservation: 'Observación',
    TviSignatureFilID: 168,
    Snapshot: '{"Visit":{}}',
    _raw: { _status: 'synced', _changed: '' },
    _dangerouslySetRawWithoutMarkingColumnChange(field, value) {
      this[field as keyof TestRecord] = value as never;
    },
    prepareUpdate(update) {
      update(this);
      return this;
    },
  };
  jest.mocked(database.get).mockReturnValue({
    query: () => ({ fetch: async () => [record] }),
  } as never);

  const canonicalData = {
    SyncVersion: 'server-version',
    SecStatus: true,
    CreateUserId: 1,
    UpdateUserId: 1,
    DeleteUserId: null,
    CreateDate: record.CreateDate,
    UpdateDate: '2026-10-27T00:22:58.898795Z',
    DeleteDate: null,
    TviID: 1,
    TvsID: 1,
    TviPerformedDate: record.TviPerformedDate,
    TviDocumentSeries: '1',
    TviDocumentNumber: 2,
    TviLatitude: record.TviLatitude,
    TviLongitude: record.TviLongitude,
    TviObservation: record.TviObservation,
    TviSignatureFilID: 168,
    Snapshot: '{"Visit":{"TviSignatureFilID":168}}',
  } as unknown as OagTechnicalVisit;

  await applyTechnicalVisitAcknowledgements([
    {
      SyncId: syncId,
      ExpectedSyncVersion: 'client-version',
      Data: canonicalData,
    },
  ]);

  expect(record.SyncVersion).toBe('server-version');
  expect(record.Snapshot).toBe('{"Visit":{"TviSignatureFilID":168}}');
  expect(record._raw).toEqual({ _status: 'synced', _changed: '' });
  expect(database.batch).toHaveBeenCalledWith(record);
});
