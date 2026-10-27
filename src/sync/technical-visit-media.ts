import { Q } from '@nozbe/watermelondb';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { SYNC_RESOURCES, type SyncPushChange } from '@/contracts/sync';
import type { OagTechnicalVisit } from '@/contracts/entities/operationsagr';
import {
  getActiveDatabase,
  OagTechnicalVisitModel,
} from '@/database';
import { uploadManagedFile, type PickedFile } from '@/lib/fileService';
import { normalizeTechnicalVisitTemporaryIds } from '@/sync/technical-visit-temp-ids';

type PendingFile = PickedFile;
type CheckpointFile = PendingFile & {
  UploadId?: string;
  UploadedFileId?: number;
};
type VisitSnapshot = {
  Visit: Record<string, unknown>;
  Evidences: Record<string, unknown>[];
  PendingSignatureFile?: CheckpointFile | null;
  [key: string]: unknown;
};

type FileLocation = { kind: 'signature' } | { kind: 'evidence'; index: number };

function pendingFileAt(
  snapshot: VisitSnapshot,
  location: FileLocation,
): CheckpointFile | undefined {
  if (location.kind === 'signature') return snapshot.PendingSignatureFile ?? undefined;
  return snapshot.Evidences[location.index]?.PendingFile as
    | CheckpointFile
    | undefined;
}

async function updateUploadCheckpoint(
  syncId: string,
  location: FileLocation,
  file: CheckpointFile,
  update: Partial<Pick<CheckpointFile, 'UploadId' | 'UploadedFileId'>>,
  database = getActiveDatabase(),
): Promise<CheckpointFile> {
  let savedFile: CheckpointFile | null = null;
  await database.write(async () => {
    const records = await database
      .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
      .query(Q.where('SyncId', syncId))
      .fetch();
    const record = records[0];
    if (!record)
      throw new Error('No se pudo guardar el avance de los archivos locales.');
    const latest = JSON.parse(record.Snapshot) as VisitSnapshot;
    const latestFile = pendingFileAt(latest, location);
    if (
      !latestFile ||
      latestFile.uri !== file.uri ||
      latestFile.name !== file.name ||
      (latestFile.mimeType ?? null) !== (file.mimeType ?? null)
    )
      throw new Error('El archivo local cambió durante la sincronización.');
    Object.assign(latestFile, update);
    const checkpoint = record.prepareUpdate((model) => {
      model.Snapshot = JSON.stringify(latest);
    });
    await database.batch(checkpoint);
    savedFile = latestFile;
  }, 'save technical visit media upload checkpoint');
  if (!savedFile)
    throw new Error('No se pudo guardar el avance de los archivos locales.');
  return savedFile;
}

async function loadVisitRecord(
  syncId: string,
  database = getActiveDatabase(),
): Promise<OagTechnicalVisitModel> {
  const records = await database
    .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
    .query(Q.where('SyncId', syncId))
    .fetch();
  if (!records[0])
    throw new Error('No se encontró la visita local durante la sincronización.');
  return records[0];
}

async function uploadPendingFile(
  file: CheckpointFile,
  route: string,
  syncId: string,
  location: FileLocation,
  userId: number,
  database = getActiveDatabase(),
  identityKey?: string,
): Promise<number> {
  if (file.UploadedFileId) return file.UploadedFileId;
  const initialCheckpoint = await updateUploadCheckpoint(
    syncId,
    location,
    file,
    { UploadId: file.UploadId ?? randomUUID() },
    database,
  );
  Object.assign(file, initialCheckpoint);
  if (file.UploadedFileId) return file.UploadedFileId;
  let uploadFile: PickedFile = file;
  if (Platform.OS === 'web' && file.uri.startsWith('data:')) {
    const blob = await (await fetch(file.uri)).blob();
    uploadFile = {
      ...file,
      file: new File([blob], file.name, {
        type: file.mimeType || blob.type || 'application/octet-stream',
      }),
    };
  }
  const uploaded = await uploadManagedFile(
    uploadFile,
    route,
    `nova-media-${file.UploadId}`,
    userId,
    identityKey,
  );
  const checkpointed = await updateUploadCheckpoint(
    syncId,
    location,
    file,
    { UploadedFileId: uploaded.FileId },
    database,
  );
  Object.assign(file, checkpointed);
  return checkpointed.UploadedFileId!;
}

const cloneSnapshot = (snapshot: VisitSnapshot): VisitSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as VisitSnapshot;

export async function prepareTechnicalVisitMedia(
  changes: SyncPushChange[],
  userId: number,
  database = getActiveDatabase(),
  identityKey?: string,
): Promise<void> {
  for (const change of changes) {
    if (
      change.Resource !== SYNC_RESOURCES.OagTechnicalVisit ||
      change.Operation === 'D'
    )
      continue;
    if (!change.Data) continue;
    const data = change.Data as OagTechnicalVisit;
    const ids = new Map<number, number>();
    let changed = normalizeTechnicalVisitTemporaryIds(data, ids);
    const raw = data.Snapshot;
    const checkpointSnapshot = JSON.parse(raw) as VisitSnapshot;
    changed =
      normalizeTechnicalVisitTemporaryIds(checkpointSnapshot, ids) || changed;

    const pendingSignature = checkpointSnapshot.PendingSignatureFile;
    if (pendingSignature) {
      await uploadPendingFile(
        pendingSignature,
        'ROUTE_TECHNICAL_VISIT_FILES',
        change.SyncId,
        { kind: 'signature' },
        userId,
        database,
        identityKey,
      );
      changed = true;
    }

    const checkpointEvidence = checkpointSnapshot.Evidences;
    for (let index = 0; index < checkpointEvidence.length; index++) {
      const evidence = checkpointEvidence[index];
      const pendingFile = evidence.PendingFile as CheckpointFile | undefined;
      if (!pendingFile) continue;
      await uploadPendingFile(
        pendingFile,
        'ROUTE_TECHNICAL_VISIT_FILES',
        change.SyncId,
        { kind: 'evidence', index },
        userId,
        database,
        identityKey,
      );
      changed = true;
    }

    if (!changed) continue;
    const latestRecord = await loadVisitRecord(change.SyncId, database);
    const latest = JSON.parse(latestRecord.Snapshot) as VisitSnapshot;
    if (
      (latest.PendingSignatureFile &&
        !latest.PendingSignatureFile.UploadedFileId) ||
      latest.Evidences.some(({ PendingFile }) => {
        const file = PendingFile as CheckpointFile | undefined;
        return file && !file.UploadedFileId;
      })
    )
      throw new Error(
        'La visita cambió mientras se cargaban archivos; vuelve a sincronizar.',
      );
    const pushSnapshot = cloneSnapshot(latest);
    normalizeTechnicalVisitTemporaryIds(pushSnapshot, ids);
    data.TviSignatureFilID =
      (pushSnapshot.Visit.TviSignatureFilID as number | null | undefined) ??
      null;
    data.TviID = latestRecord.TviID;
    data.TvsID = latestRecord.TvsID;
    data.TviPerformedDate = latestRecord.TviPerformedDate;
    data.TviDocumentSeries = latestRecord.TviDocumentSeries;
    data.TviDocumentNumber = latestRecord.TviDocumentNumber;
    data.TviLatitude = latestRecord.TviLatitude;
    data.TviLongitude = latestRecord.TviLongitude;
    data.TviObservation = latestRecord.TviObservation;
    if (pushSnapshot.PendingSignatureFile?.UploadedFileId) {
      pushSnapshot.Visit.TviSignatureFilID =
        pushSnapshot.PendingSignatureFile.UploadedFileId;
      data.TviSignatureFilID = pushSnapshot.Visit.TviSignatureFilID as number;
      delete pushSnapshot.PendingSignatureFile;
    }
    for (const evidence of pushSnapshot.Evidences) {
      const file = evidence.PendingFile as CheckpointFile | undefined;
      if (!file?.UploadedFileId) continue;
      evidence.TveFilID = file.UploadedFileId;
      delete evidence.PendingFile;
    }
    data.Snapshot = JSON.stringify(pushSnapshot);
  }
}

export async function applyTechnicalVisitAcknowledgements(
  acknowledgements: {
    SyncId: string;
    ExpectedSyncVersion: string;
    Data: OagTechnicalVisit;
  }[],
  database = getActiveDatabase(),
): Promise<void> {
  for (const acknowledgement of acknowledgements) {
    const records = await database
      .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
      .query(Q.where('SyncId', acknowledgement.SyncId))
      .fetch();
    const record = records[0];
    if (
      !record ||
      record._raw._status !== 'synced' ||
      record.SyncVersion !== acknowledgement.ExpectedSyncVersion
    )
      continue;

    const entity = acknowledgement.Data;
    await database.write(async () => {
      const prepared = record.prepareUpdate((model) => {
        model.SyncVersion = entity.SyncVersion;
        model.SecStatus = entity.SecStatus;
        model.CreateUserId = entity.CreateUserId;
        model.UpdateUserId = entity.UpdateUserId;
        model.DeleteUserId = entity.DeleteUserId;
        model.CreateDate = entity.CreateDate;
        model.UpdateDate = entity.UpdateDate;
        model.DeleteDate = entity.DeleteDate;
        model.TviID = entity.TviID;
        model.TvsID = entity.TvsID;
        model.TviPerformedDate = entity.TviPerformedDate;
        model.TviDocumentSeries = entity.TviDocumentSeries ?? null;
        model.TviDocumentNumber = entity.TviDocumentNumber ?? null;
        model.TviLatitude = entity.TviLatitude ?? null;
        model.TviLongitude = entity.TviLongitude ?? null;
        model.TviObservation = entity.TviObservation ?? null;
        model.TviSignatureFilID = entity.TviSignatureFilID ?? null;
        model.Snapshot = entity.Snapshot;
        model._raw._status = 'synced';
        model._raw._changed = '';
      });
      await database.batch(prepared);
    });
  }
}
