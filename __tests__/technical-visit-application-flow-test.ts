import { validateTechnicalVisitSnapshot, type TechnicalVisitSnapshot } from '@/lib/technical-visit-validation';

describe('Technical visit application flow & parity', () => {
  it('validates application with insumo details correctly (returns null when valid)', () => {
    const validSnapshot: TechnicalVisitSnapshot = {
      Visit: {
        TviID: 1,
        TviPerformedDate: '2026-11-10T08:00:00.000-05:00',
        TviLatitude: -5.123,
        TviLongitude: -80.456,
        TviSignatureFilID: 10,
      },
      Applications: [
        {
          SecStatus: true,
          TapID: -1,
          TapApplicationMode: 1, // General
          TapStartDateTime: '2026-11-10T08:00:00.000-05:00',
          TapEndDateTime: '2026-11-10T17:00:00.000-05:00',
          TapWaterLiters: 200,
          TapFuelExpense: 5,
          TapAppliedHectares: 14,
          TapAppliedPlants: 1200,
          TapGeneralObservation: 'Aplicación foliar preventiva',
        },
      ],
      ApplicationDetails: [
        {
          SecStatus: true,
          TadID: -2,
          TapID: -1,
          TadFrsID: 1,
          TadFstID: 1,
          TadIsObservation: false,
          TadProductDescription: 'Bioinsecticida de neem para manejo integrado',
          TadApplicationType: 1, // Foliar
          TadDose: 0.5,
          TadDoseUnit: 1, // kg/ha
          TadQuantity: 10,
          TadQuantityUnit: 1, // kg
          TadObservation: 'Aplicar a primera hora de la mañana',
        },
      ],
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
      PendingSignatureFile: null,
    };

    const error = validateTechnicalVisitSnapshot(validSnapshot);
    expect(error).toBeNull();
  });

  it('auto-selects crop target when supply has target matching the plot crop', () => {
    const targets = [
      {
        value: 1,
        label: 'Arañita Roja · dosis 0.5–1',
        FrsID: 1,
        CltID: 1,
        ObjID: 1,
        FstMinDose: 0.5,
        FstMaxDose: 1.0,
        objectiveName: 'Arañita Roja',
      },
      {
        value: 2,
        label: 'Mosca de la fruta · dosis 2–3',
        FrsID: 1,
        CltID: 2, // Different crop
        ObjID: 5,
        FstMinDose: 2.0,
        FstMaxDose: 3.0,
        objectiveName: 'Mosca de la fruta',
      },
      {
        value: 3,
        label: 'Deficiencia de zinc · dosis 1–1.5',
        FrsID: 7,
        CltID: 1,
        ObjID: 2,
        FstMinDose: 1.0,
        FstMaxDose: 1.5,
        objectiveName: 'Deficiencia de zinc',
      },
    ];

    const plotCropId = 1;
    const selectedSupplyId = 1;

    // Simulate auto-selection algorithm used in TechnicalVisitApplicationModal
    const cropTargets = targets.filter(
      (t) => t.FrsID === selectedSupplyId && (!plotCropId || t.CltID === plotCropId),
    );
    const allSupplyTargets = targets.filter((t) => t.FrsID === selectedSupplyId);
    const autoTarget = cropTargets.length > 0 ? cropTargets[0] : allSupplyTargets[0] ?? null;

    expect(autoTarget).not.toBeNull();
    expect(autoTarget?.value).toBe(1);
    expect(autoTarget?.objectiveName).toBe('Arañita Roja');
    expect(autoTarget?.FstMinDose).toBe(0.5);
  });

  it('rejects saving application detail if product description is missing', () => {    const invalidSnapshot: TechnicalVisitSnapshot = {
      Visit: {
        TviID: 1,
        TviPerformedDate: '2026-11-10T08:00:00.000-05:00',
        TviLatitude: -5.123,
        TviLongitude: -80.456,
        TviSignatureFilID: 10,
      },
      Applications: [
        {
          SecStatus: true,
          TapID: -1,
          TapApplicationMode: 1,
          TapStartDateTime: '2026-11-10T08:00:00.000-05:00',
          TapEndDateTime: '2026-11-10T17:00:00.000-05:00',
        },
      ],
      ApplicationDetails: [
        {
          SecStatus: true,
          TadID: -2,
          TapID: -1,
          TadFrsID: 1,
          TadFstID: 1,
          TadIsObservation: false,
          TadProductDescription: '', // Missing description
          TadApplicationType: 1,
          TadDose: 0.5,
          TadDoseUnit: 1,
          TadQuantity: 10,
          TadQuantityUnit: 1,
        },
      ],
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
      PendingSignatureFile: null,
    };

    const error = validateTechnicalVisitSnapshot(invalidSnapshot);
    expect(error).toBeTruthy();
    expect(error).toContain('producto');
  });

  it('derives the target row from the objective and supply selected (inverted flow)', () => {
    const targets = [
      {
        value: 1,
        label: 'Arañita Roja · dosis 0.5–1',
        FrsID: 1,
        CltID: 1,
        ObjID: 1,
        FstMinDose: 0.5,
        FstMaxDose: 1.0,
        objectiveName: 'Arañita Roja',
      },
      {
        value: 2,
        label: 'Mosca de la fruta · dosis 2–3',
        FrsID: 1,
        CltID: 2, // Other crop
        ObjID: 5,
        FstMinDose: 2.0,
        FstMaxDose: 3.0,
        objectiveName: 'Mosca de la fruta',
      },
      {
        value: 3,
        label: 'Deficiencia de zinc · dosis 1–1.5',
        FrsID: 7,
        CltID: 1,
        ObjID: 2,
        FstMinDose: 1.0,
        FstMaxDose: 1.5,
        objectiveName: 'Deficiencia de zinc',
      },
    ];

    const plotCropId = 1;
    const selectedObjectiveId = 1;

    // Objetivos disponibles: los que tienen insumos registrados para el cultivo del lote.
    const objectives = [
      ...new Set(
        targets
          .filter((t) => !plotCropId || t.CltID === plotCropId)
          .map((t) => t.ObjID),
      ),
    ];
    expect(objectives).toEqual([1, 2]);

    // Elegir el objetivo filtra los insumos y resuelve el target (FstID).
    const suppliesForObjective = targets.filter(
      (t) =>
        (!plotCropId || t.CltID === plotCropId) &&
        t.ObjID === selectedObjectiveId,
    );
    expect(suppliesForObjective).toHaveLength(1);
    expect(suppliesForObjective[0].value).toBe(1);
    expect(suppliesForObjective[0].FrsID).toBe(1);
    expect(suppliesForObjective[0].objectiveName).toBe('Arañita Roja');
  });
});
