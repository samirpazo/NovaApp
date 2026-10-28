import { scheduledTechnicalVisit } from '@/lib/technical-visit-validation';
import {
  previousTechnicalVisitRows,
  validateTechnicalVisitSnapshot,
  type TechnicalVisitSnapshot,
} from '@/lib/technical-visit-validation';

const currentVisitId = -1;
const currentVisitDate = '2026-10-25T15:00:00.000-05:00';

function snapshot(): TechnicalVisitSnapshot {
  return {
    Visit: {
      TviID: currentVisitId,
      TviPerformedDate: currentVisitDate,
      TviLatitude: null,
      TviLongitude: null,
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
    PendingSignatureFile: {
      uri: 'file:///signature.png',
      name: 'signature.png',
      mimeType: 'image/png',
    },
  };
}

function completeSnapshot(): TechnicalVisitSnapshot {
  return {
    ...snapshot(),
    Applications: [
      {
        SecStatus: true,
        TapID: -2,
        TapApplicationMode: 1,
        TapStartDateTime: '2026-10-25T08:00:00.000-05:00',
        TapEndDateTime: '2026-10-25T10:00:00.000-05:00',
      },
    ],
    ApplicationDetails: [
      {
        SecStatus: true,
        TadID: -3,
        TapID: -2,
        TadFrsID: 10,
        TadFstID: 20,
        TadProductDescription: 'Producto',
        TadApplicationType: 1,
        TadDose: 1,
        TadDoseUnit: 1,
        TadQuantity: 1,
        TadQuantityUnit: 1,
      },
    ],
    Diagnoses: [
      {
        SecStatus: true,
        TvdID: -4,
        TvdCategory: 1,
        TvdIncidencePercentage: 5,
      },
    ],
    Phenology: [
      {
        SecStatus: true,
        TphID: -5,
        TphStage: 1,
        TphPercentage: 30,
      },
    ],
    Activities: [
      {
        SecStatus: true,
        TvaID: -6,
        TvaActivityType: 2,
        TvaStartDate: '2026-10-25T08:00:00.000-05:00',
        TvaEndDate: '2026-10-25T09:00:00.000-05:00',
      },
    ],
    Installations: [
      {
        SecStatus: true,
        TinID: -7,
        TinInstallationType: 1,
        TinIsAvailable: true,
      },
    ],
    Recommendations: [
      {
        SecStatus: true,
        TvrID: -8,
        TvrRecommendationType: 1,
        TvrObjective: 'Objetivo',
        TvrInstruction: 'Indicaciones',
        TvrDose: 1,
        TvrDoseUnit: 1,
        TvrSortOrder: 1,
        FrsID: 10,
        FstID: 20,
      },
    ],
    PreviousRecommendations: [
      {
        SecStatus: true,
        TvrID: 30,
        TviID: -10,
        TviPerformedDate: '2026-10-20T10:00:00.000-05:00',
      },
    ],
    RecommendationFollowUps: [
      {
        SecStatus: true,
        TrfID: -9,
        TvrID: 30,
        TrfStatus: 1,
      },
    ],
    CulturalActivities: [
      {
        SecStatus: true,
        TcaID: -11,
        TcaActivityType: 1,
        TcaStartDate: '2026-10-25T08:00:00.000-05:00',
        TcaEndDate: '2026-10-25T09:00:00.000-05:00',
      },
    ],
    PreviousCulturalActivities: [
      {
        SecStatus: true,
        TcaID: 40,
        TviID: -12,
        TviPerformedDate: '2026-10-21T10:00:00.000-05:00',
      },
    ],
    CulturalActivityFollowUps: [
      {
        SecStatus: true,
        TcfID: -13,
        TcaID: 40,
        TcfStatus: 1,
      },
    ],
    Evidences: [
      {
        SecStatus: true,
        TveID: -14,
        TveFilID: 50,
      },
    ],
  };
}

describe('technical visit validation', () => {
  it('accepts a complete snapshot with pending signature', () => {
    expect(validateTechnicalVisitSnapshot(completeSnapshot())).toBeNull();
  });

  it('allows saving without a producer signature', () => {
    const value = completeSnapshot();
    value.PendingSignatureFile = undefined;
    value.Visit.TviSignatureFilID = null;

    expect(validateTechnicalVisitSnapshot(value)).toBeNull();
  });

  it('allows recommendations without producer instructions', () => {
    const value = completeSnapshot();
    value.Recommendations[0].TvrInstruction = '';

    expect(validateTechnicalVisitSnapshot(value)).toBeNull();
  });

  it('allows catalog recommendations without a configured objective', () => {
    const value = completeSnapshot();
    value.Recommendations[0].TvrObjective = '';
    delete value.Recommendations[0].FstID;

    expect(validateTechnicalVisitSnapshot(value)).toBeNull();
  });

  it('still requires an objective for freeform recommendations', () => {
    const value = completeSnapshot();
    value.Recommendations[0].FrsID = null;
    value.Recommendations[0].FstID = null;
    value.Recommendations[0].TvrProductDescription = 'Producto observado';
    value.Recommendations[0].TvrObjective = '';

    expect(validateTechnicalVisitSnapshot(value)).toBe(
      'Describe el objetivo de la recomendación.',
    );
  });

  it('requires coherent application dates but allows supplies without targets', () => {
    const value = completeSnapshot();
    value.Applications[0].TapEndDateTime = '2026-10-25T07:00:00.000-05:00';
    expect(validateTechnicalVisitSnapshot(value)).toBe(
      'La fecha y hora de fin deben ser posteriores al inicio.',
    );

    const withoutTarget = completeSnapshot();
    delete withoutTarget.ApplicationDetails[0].TadFstID;
    expect(validateTechnicalVisitSnapshot(withoutTarget)).toBeNull();
  });

  it('rejects follow-ups that point to the current visit', () => {
    const value = completeSnapshot();
    value.RecommendationFollowUps[0].TvrID = value.Recommendations[0].TvrID;

    expect(validateTechnicalVisitSnapshot(value)).toBe(
      'El seguimiento debe corresponder a una recomendación anterior del lote.',
    );
  });

  it('rejects duplicated phenology and cultural activity types', () => {
    const phenology = completeSnapshot();
    phenology.Phenology.push({ ...phenology.Phenology[0], TphID: -15 });
    expect(validateTechnicalVisitSnapshot(phenology)).toBe(
      'No repitas la misma etapa fenológica en la visita.',
    );

    const cultural = completeSnapshot();
    cultural.CulturalActivities.push({
      ...cultural.CulturalActivities[0],
      TcaID: -16,
    });
    expect(validateTechnicalVisitSnapshot(cultural)).toBe(
      'No repitas el mismo tipo de actividad cultural en la visita.',
    );
  });

  it('filters previous rows by current visit and date', () => {
    const rows = [
      {
        SecStatus: true,
        TvrID: 1,
        TviID: currentVisitId,
        TviPerformedDate: '2026-10-20T10:00:00.000-05:00',
      },
      {
        SecStatus: true,
        TvrID: 2,
        TviID: -20,
        TviPerformedDate: currentVisitDate,
      },
      {
        SecStatus: true,
        TvrID: 3,
        TviID: -21,
        TviPerformedDate: '2026-10-20T10:00:00.000-05:00',
      },
      {
        SecStatus: false,
        TvrID: 4,
        TviID: -22,
        TviPerformedDate: '2026-10-20T10:00:00.000-05:00',
      },
    ];

    expect(
      previousTechnicalVisitRows(rows, currentVisitId, currentVisitDate).map(
        (row) => row.TvrID,
      ),
    ).toEqual([3]);
  });
});

describe('selección de visita al abrir una programación', () => {
  const records = [
    { TvsID: 1, TviID: -1, id: 'draft' },
    { TvsID: 1, TviID: 10, id: 'server' },
    { TvsID: 2, TviID: 20, id: 'other-schedule' },
  ];
  test('abre el registro asignado aunque un borrador vacío aparezca primero', () => {
    expect(scheduledTechnicalVisit({ TvsID: 1, TviID: 10 }, records)?.id).toBe(
      'server',
    );
  });
  test('no sustituye una visita registrada ausente por otro borrador local', () => {
    expect(
      scheduledTechnicalVisit({ TvsID: 1, TviID: 11 }, records),
    ).toBeUndefined();
  });
  test('permite continuar un borrador cuando la programación aún no tiene visita registrada', () => {
    expect(
      scheduledTechnicalVisit({ TvsID: 1, TviID: null }, records)?.id,
    ).toBe('draft');
  });
});
