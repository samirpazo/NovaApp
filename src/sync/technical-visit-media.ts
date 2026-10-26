import { Q } from '@nozbe/watermelondb';
import { Platform } from 'react-native';

import { SYNC_RESOURCES, type SyncPushChange } from '@/contracts/sync';
import type { OagTechnicalVisit } from '@/contracts/entities/operationsagr';
import { database, OagTechnicalVisitModel } from '@/database';
import { uploadManagedFile, type PickedFile } from '@/lib/fileService';

type PendingFile = PickedFile;
type VisitSnapshot = {
  Visit: Record<string, unknown>;
  Evidences: Record<string, unknown>[];
  PendingSignatureFile?: PendingFile | null;
  [key: string]: unknown;
};

export async function prepareTechnicalVisitMedia(
  changes: SyncPushChange[],
): Promise<void> {
  for (const change of changes) {
    if (
      change.Resource !== SYNC_RESOURCES.OagTechnicalVisit ||
      change.Operation === 'D'
    )
      continue;
    if (!change.Data) continue;
    const data = change.Data as OagTechnicalVisit;
    const raw = data.Snapshot;
    const snapshot = JSON.parse(raw) as VisitSnapshot;
    let changed = false;

    if (snapshot.PendingSignatureFile) {
      const pendingSignature = snapshot.PendingSignatureFile;
      const signatureFile =
        Platform.OS === 'web' &&
        pendingSignature.uri.startsWith('data:image/png;base64,')
          ? {
              ...pendingSignature,
              file: new File(
                [await (await fetch(pendingSignature.uri)).blob()],
                pendingSignature.name,
                { type: pendingSignature.mimeType ?? 'image/png' },
              ),
            }
          : pendingSignature;
      const file = await uploadManagedFile(
        signatureFile,
        'ROUTE_TECHNICAL_VISIT_FILES',
      );
      snapshot.Visit.TviSignatureFilID = file.FileId;
      data.TviSignatureFilID = file.FileId;
      delete snapshot.PendingSignatureFile;
      changed = true;
    }

    for (const evidence of snapshot.Evidences) {
      const pendingFile = evidence.PendingFile as PendingFile | undefined;
      if (!pendingFile) continue;
      const file = await uploadManagedFile(
        pendingFile,
        'ROUTE_TECHNICAL_VISIT_FILES',
      );
      evidence.TveFilID = file.FileId;
      delete evidence.PendingFile;
      changed = true;
    }

    if (!changed) continue;
    data.Snapshot = JSON.stringify(snapshot);
    const records = await database
      .get<OagTechnicalVisitModel>(SYNC_RESOURCES.OagTechnicalVisit)
      .query(Q.where('SyncId', change.SyncId))
      .fetch();
    const record = records[0];
    if (!record)
      throw new Error(
        'No se encontró la visita local para guardar sus archivos.',
      );
    await database.write(() =>
      record.update((model) => {
        model.Snapshot = data.Snapshot;
        model.TviSignatureFilID = snapshot.Visit.TviSignatureFilID as
          number | null;
      }),
    );
  }
}
