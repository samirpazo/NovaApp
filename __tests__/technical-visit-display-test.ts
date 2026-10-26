import { technicalVisitDisplayValues } from '@/lib/technical-visit-display';

describe('technicalVisitDisplayValues', () => {
  it('uses readable catalog and joined values, keeps zero and hides internal IDs', () => {
    const values = technicalVisitDisplayValues(
      {
        TphStage: 3,
        TphStageDescription: 'Fructificación',
        TphPercentage: 0,
        TadApplicationType: 2,
        TadApplicationDate: '2026-10-25T05:00:00.000Z',
        TapApplicationModeDescription: 'Foliar',
        TviID: 42,
        SyncId: 'internal',
        PendingFile: { uri: 'file://private' },
      },
      [
        {
          key: 'TphStage',
          label: 'Etapa fenológica',
          definitionCode: 'OAG_PHENOLOGICAL_STAGE',
        },
        { key: 'TphPercentage', label: 'Porcentaje (%)', kind: 'decimal' },
        {
          key: 'TadApplicationType',
          label: 'Tipo de aplicación',
          definitionCode: 'OAG_APPLICATION_TYPE',
        },
      ],
      {
        OAG_PHENOLOGICAL_STAGE: [{ label: 'Catálogo', value: 3 }],
        OAG_APPLICATION_TYPE: [{ label: 'Foliar', value: 2 }],
      },
    );

    expect(values).toEqual([
      { label: 'Etapa fenológica', value: 'Fructificación' },
      { label: 'Porcentaje (%)', value: '0' },
      { label: 'Tipo de aplicación', value: 'Foliar' },
      { label: 'Fecha de aplicación', value: '25/10/2026 00:00' },
      { label: 'Modo de aplicación', value: 'Foliar' },
    ]);
  });
});
