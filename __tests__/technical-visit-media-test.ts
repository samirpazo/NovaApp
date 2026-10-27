import {
  applyTechnicalVisitAcknowledgements,
  prepareTechnicalVisitMedia,
} from '@/sync/technical-visit-media';
import { uploadManagedFile } from '@/lib/fileService';
import { SYNC_RESOURCES, type SyncPushChange } from '@/contracts/sync';
import type { OagTechnicalVisit } from '@/contracts/entities/operationsagr';

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: () => `fake-upload-${++sequence}` };
});
jest.mock('@/lib/fileService', () => ({ uploadManagedFile: jest.fn() }));
const mockDatabase = {
    get: jest.fn(),
    localStorage: { get: jest.fn(), set: jest.fn() },
    write: jest.fn((work: () => Promise<void>) => work()),
    batch: jest.fn(),
};
jest.mock('@/database', () => ({
  getActiveDatabase: () => mockDatabase,
}));

beforeEach(() => {
  jest.mocked(uploadManagedFile).mockReset();
  jest.mocked(mockDatabase.get).mockReset();
  jest.mocked(mockDatabase.batch).mockReset();
});

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
  jest.mocked(mockDatabase.get).mockReturnValue({
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

  await prepareTechnicalVisitMedia([change], 11);

  expect(uploadManagedFile).toHaveBeenCalledTimes(1);
  expect(uploadManagedFile).toHaveBeenCalledWith(
    expect.objectContaining({ uri: pendingSignature.uri }),
    'ROUTE_TECHNICAL_VISIT_FILES',
    expect.stringMatching(/^nova-media-/),
    11,
    undefined,
  );
  expect(
    (
      change.Data as
        | { TviSignatureFilID?: number | null }
        | undefined
    )?.TviSignatureFilID,
  ).toBe(165);
  expect(record.TviSignatureFilID).toBeNull();
  expect(JSON.parse(record.Snapshot).PendingSignatureFile).toMatchObject({
    uri: pendingSignature.uri,
    UploadedFileId: 165,
  });
  expect(
    JSON.parse((change.Data as { Snapshot: string }).Snapshot),
  ).not.toHaveProperty('PendingSignatureFile');
  expect(record._raw._status).toBe('updated');
  expect(record._raw._changed).toBe('Snapshot,TviSignatureFilID');
  expect(uploadManagedFile).toHaveBeenCalledTimes(1);
});

test('persists each successful file receipt and reuses it after a later upload fails', async () => {
  const snapshot = {
    Visit: {},
    Evidences: [
      {
        TveFilID: null,
        PendingFile: {
          uri: '/local/a.jpg',
          name: 'a.jpg',
          mimeType: 'image/jpeg',
        },
      },
      {
        TveFilID: null,
        PendingFile: {
          uri: '/local/b.jpg',
          name: 'b.jpg',
          mimeType: 'image/jpeg',
        },
      },
    ],
  };
  const record = {
    TviID: 1,
    TvsID: 1,
    TviPerformedDate: '2026-10-27T00:00:00Z',
    TviDocumentSeries: '1',
    TviDocumentNumber: 1,
    TviLatitude: null,
    TviLongitude: null,
    TviObservation: 'before upload',
    Snapshot: JSON.stringify(snapshot),
    prepareUpdate(update: (model: { Snapshot: string }) => void) {
      update(this);
      return this;
    },
  };
  jest.mocked(mockDatabase.get).mockReturnValue({
    query: () => ({ fetch: async () => [record] }),
  } as never);
  jest
    .mocked(uploadManagedFile)
    .mockResolvedValueOnce({
      FileId: 201,
      OriginalName: 'a.jpg',
      MimeType: 'image/jpeg',
      Size: 100,
      PreviewStatus: 'Ready',
      CanDownload: true,
    })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      FileId: 202,
      OriginalName: 'b.jpg',
      MimeType: 'image/jpeg',
      Size: 100,
      PreviewStatus: 'Ready',
      CanDownload: true,
    });

  const firstAttempt = {
    Resource: SYNC_RESOURCES.OagTechnicalVisit,
    SyncId: syncId,
    Operation: 'U',
    Data: { TviSignatureFilID: null, Snapshot: JSON.stringify(snapshot) },
  } as unknown as SyncPushChange;
  await expect(prepareTechnicalVisitMedia([firstAttempt], 11)).rejects.toThrow(
    'offline',
  );

  const checkpoint = JSON.parse(record.Snapshot);
  expect(checkpoint.Evidences[0].PendingFile.UploadedFileId).toBe(201);
  const firstUploadKey = jest.mocked(uploadManagedFile).mock.calls[0][2];
  const secondUploadKey = jest.mocked(uploadManagedFile).mock.calls[1][2];
  expect(firstUploadKey).toEqual(expect.stringMatching(/^nova-media-/));
  expect(secondUploadKey).toEqual(expect.stringMatching(/^nova-media-/));

  const retry = {
    Resource: SYNC_RESOURCES.OagTechnicalVisit,
    SyncId: syncId,
    Operation: 'U',
    Data: {
      TviSignatureFilID: null,
      Snapshot: record.Snapshot,
    },
  } as unknown as SyncPushChange;
  await prepareTechnicalVisitMedia([retry], 11);

  expect(jest.mocked(uploadManagedFile)).toHaveBeenCalledTimes(3);
  expect(jest.mocked(uploadManagedFile).mock.calls[2][2]).toBe(secondUploadKey);
  expect(JSON.parse(record.Snapshot).Evidences[0].PendingFile.UploadedFileId).toBe(
    201,
  );
  expect(JSON.parse(record.Snapshot).Evidences[1].PendingFile.UploadedFileId).toBe(
    202,
  );
  expect(JSON.parse((retry.Data as { Snapshot: string }).Snapshot).Evidences).toEqual([
    { TveFilID: 201 },
    { TveFilID: 202 },
  ]);
});

test('merges the upload receipt into the latest snapshot without erasing concurrent edits', async () => {
  const snapshot = {
    Visit: { TviObservation: 'before upload' },
    Evidences: [],
    PendingSignatureFile: {
      uri: '/local/signature.png',
      name: 'signature.png',
      mimeType: 'image/png',
    },
  };
  const record = {
    TviID: 1,
    TvsID: 1,
    TviPerformedDate: '2026-10-27T00:00:00Z',
    TviDocumentSeries: '1',
    TviDocumentNumber: 1,
    TviLatitude: null,
    TviLongitude: null,
    TviObservation: 'before upload',
    Snapshot: JSON.stringify(snapshot),
    prepareUpdate(update: (model: { Snapshot: string }) => void) {
      update(this);
      return this;
    },
  };
  jest.mocked(mockDatabase.get).mockReturnValue({
    query: () => ({ fetch: async () => [record] }),
  } as never);
  jest.mocked(uploadManagedFile).mockImplementation(async () => {
    const latest = JSON.parse(record.Snapshot);
    latest.Visit.TviObservation = 'edited during upload';
    record.Snapshot = JSON.stringify(latest);
    record.TviObservation = 'edited during upload';
    return {
      FileId: 303,
      OriginalName: 'signature.png',
      MimeType: 'image/png',
      Size: 100,
      PreviewStatus: 'Ready',
      CanDownload: true,
    };
  });

  const change = {
    Resource: SYNC_RESOURCES.OagTechnicalVisit,
    SyncId: syncId,
    Operation: 'U',
    Data: { Snapshot: JSON.stringify(snapshot) },
  } as unknown as SyncPushChange;
  await prepareTechnicalVisitMedia([change], 11);

  const saved = JSON.parse(record.Snapshot);
  expect(saved.Visit.TviObservation).toBe('edited during upload');
  expect(saved.PendingSignatureFile.UploadedFileId).toBe(303);
  expect(
    (change.Data as OagTechnicalVisit).TviObservation,
  ).toBe('edited during upload');
  expect(
    JSON.parse((change.Data as OagTechnicalVisit).Snapshot).Visit.TviObservation,
  ).toBe('edited during upload');
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
  jest.mocked(mockDatabase.get).mockReturnValue({
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
  expect(mockDatabase.batch).toHaveBeenCalledWith(record);
});
