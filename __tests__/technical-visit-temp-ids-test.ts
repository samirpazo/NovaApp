import {
  createTechnicalVisitTemporaryId,
  normalizeTechnicalVisitTemporaryIds,
} from '@/sync/technical-visit-temp-ids';

describe('technical visit temporary IDs', () => {
  it('generates negative IDs within the server Int32 range', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_793_068_294_254);
    const id = createTechnicalVisitTemporaryId();
    const nextId = createTechnicalVisitTemporaryId();
    expect(id).toBeLessThan(0);
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(nextId).toBe(id - 1);
    jest.restoreAllMocks();
  });

  it('normalizes oversized draft IDs and keeps matching references consistent', () => {
    const draft = {
      TviID: -1_793_068_294_254,
      Snapshot: {
        Visit: { TviID: -1_793_068_294_254 },
        Applications: [{ TapID: -1_793_068_294_255 }],
        ApplicationDetails: [{ TapID: -1_793_068_294_255 }],
        Evidences: [{ TveID: -1_793_068_294_256 }],
      },
    };

    expect(normalizeTechnicalVisitTemporaryIds(draft)).toBe(true);
    expect(draft.TviID).toBe(draft.Snapshot.Visit.TviID);
    expect(draft.Snapshot.Applications[0].TapID).toBe(
      draft.Snapshot.ApplicationDetails[0].TapID,
    );
    expect(draft.Snapshot.Evidences[0].TveID).toBe(-3);
    expect(draft.TviID).toBe(-1);
  });
});
