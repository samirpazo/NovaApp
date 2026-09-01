import { GenDefinitionDetailSchema } from '@/contracts/entities/GenDefinitionDetail';

const detailWithoutImage = {
  SyncId: '683861b3-3bcd-4c2f-aff5-98d48ee3c048',
  SyncVersion: 'AAAAAAAAB9E=',
  SecStatus: true,
  CreateUserId: 1,
  UpdateUserId: 1,
  DeleteUserId: null,
  CreateDate: '2026-09-01T00:00:00.000Z',
  UpdateDate: '2026-09-01T00:00:00.000Z',
  DeleteDate: null,
  DedID: 1,
  DedCode: 'SYNC_TEST',
  DedDescription: 'Detalle sin imagen',
  DedValue: 1,
  DedAbbreviation: null,
  DedFormat: null,
  DedHelper: null,
  DedHelper2: null,
  DedIcon: null,
  DedColor: null,
  DedStated: 1,
  DefID: 1,
  DedGroup: null,
};

describe('GenDefinitionDetail contract', () => {
  test('normalizes an omitted nullable image identifier from NovaApi to null', () => {
    expect(
      GenDefinitionDetailSchema.parse(detailWithoutImage).DedImageFilID,
    ).toBeNull();
  });
});
