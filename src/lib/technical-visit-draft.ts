import { randomUUID } from 'expo-crypto';
import { DateTime } from 'luxon';
import { createTechnicalVisitTemporaryId } from '@/sync/technical-visit-temp-ids';
import type { TechnicalVisitSnapshot } from '@/lib/technical-visit-validation';

export function createTechnicalVisitDraft(
  scheduleId: number,
  ownerId: number,
): TechnicalVisitSnapshot {
  const syncId = randomUUID();
  const temporaryId = createTechnicalVisitTemporaryId();
  const now = DateTime.utc().toISO() ?? '';
  const snapshot: TechnicalVisitSnapshot = {
    Visit: {
      SyncId: syncId,
      SyncVersion: '',
      SecStatus: true,
      CreateUserId: ownerId,
      UpdateUserId: ownerId,
      DeleteUserId: null,
      CreateDate: now,
      UpdateDate: now,
      DeleteDate: null,
      TviID: temporaryId,
      TvsID: scheduleId,
      TviPerformedDate: now,
      TviDocumentSeries: null,
      TviDocumentNumber: null,
      TviLatitude: null,
      TviLongitude: null,
      TviObservation: null,
      TviSignatureFilID: null,
    },
    Applications: [],
    ApplicationDetails: [],
    Diagnoses: [],
    Phenology: [],
    Activities: [],
    Installations: [],
    Recommendations: [],
    PreviousRecommendations: [],
    RecommendationFollowUps: [],
    CulturalActivities: [],
    PreviousCulturalActivities: [],
    CulturalActivityFollowUps: [],
    Evidences: [],
  };
  return snapshot;
}
