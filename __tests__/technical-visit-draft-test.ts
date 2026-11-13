import { createTechnicalVisitDraft } from '@/lib/technical-visit-draft';
import { TechnicalVisitSnapshotSchema } from '@/lib/technical-visit-validation';

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'ca016e20-7eb5-47cd-a73a-ee924062e6b9',
}));

test('creates an in-memory aggregate with a stable identity shared by its sections', () => {
  const draft = createTechnicalVisitDraft(12, 9);
  expect(TechnicalVisitSnapshotSchema.safeParse(draft).success).toBe(true);
  expect(draft.Visit).toMatchObject({
    TvsID: 12,
    CreateUserId: 9,
    SyncVersion: '',
    TviLatitude: null,
    TviLongitude: null,
  });
  expect(Number(draft.Visit.TviID)).toBeLessThan(0);
  draft.Activities.push({ TvaID: -2, TviID: draft.Visit.TviID });
  const saved = JSON.parse(JSON.stringify(draft));
  expect(saved.Activities[0].TviID).toBe(saved.Visit.TviID);
});
