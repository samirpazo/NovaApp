import {
  OagTechnicalVisitSchema,
  OagTechnicalVisitScheduleSchema,
} from '@/contracts/entities/operationsagr';

import {
  SyncConflictResolutionSchema,
  SyncConflictSchema,
  SyncJsonSchemas,
  SyncPushChangeSchema,
  SyncPushResultSchema,
  SYNC_RESOURCES,
} from '@/contracts/sync';

const syncId = '683861b3-3bcd-4c2f-aff5-98d48ee3c048';
const definition = {
  SyncId: syncId,
  SyncVersion: 'AAAAAAAAB9E=',
  SecStatus: true,
  CreateUserId: 1,
  UpdateUserId: 1,
  DeleteUserId: null,
  CreateDate: '2026-08-31T00:00:00.000Z',
  UpdateDate: '2026-08-31T00:00:00.000Z',
  DeleteDate: null,
  DefID: -1,
  DefDescription: 'Definición de prueba',
  DefCode: 'SYNC_TEST',
  DefStated: 1,
};
const entityBase = {
  SyncId: syncId,
  SyncVersion: 'AAAAAAAAB9E=',
  SecStatus: true,
  CreateUserId: 1,
  UpdateUserId: 1,
  DeleteUserId: null,
  CreateDate: '2026-08-31T00:00:00.000Z',
  UpdateDate: '2026-08-31T00:00:00.000Z',
  DeleteDate: null,
};

describe('contratos de sincronización', () => {
  test('acepta una creación tipada de GenDefinition', () => {
    expect(
      SyncPushChangeSchema.parse({
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
        Operation: 'C',
        SyncVersion: '',
        Data: definition,
      }),
    ).toMatchObject({ Data: definition });
  });

  test('acepta la programación y el snapshot de una visita técnica', () => {
    const schedule = OagTechnicalVisitScheduleSchema.parse({
      ...entityBase,
      TvsID: -1,
      PlfID: 10,
      CmpID: 2,
      TvsScheduledDate: '2026-08-31T00:00:00.000Z',
      TvsResponsiblePrsID: 8,
      TvsVisitType: 1,
      TvsObservation: null,
      PlfName: 'Lote Norte',
      CmpName: 'Campaña 2026',
    });
    const visit = OagTechnicalVisitSchema.parse({
      ...entityBase,
      TviID: -1,
      TvsID: -1,
      TviPerformedDate: '2026-08-31T00:00:00.000Z',
      TviDocumentSeries: null,
      TviDocumentNumber: null,
      TviLatitude: null,
      TviLongitude: null,
      TviObservation: null,
      TviSignatureFilID: null,
      Snapshot: JSON.stringify({ Visit: {}, Applications: [] }),
    });

    expect(schedule.PlfName).toBe('Lote Norte');
    expect(JSON.parse(visit.Snapshot)).toMatchObject({ Applications: [] });
  });

  test('rechaza Data en una eliminación', () => {
    expect(() =>
      SyncPushChangeSchema.parse({
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
        Operation: 'D',
        Data: definition,
      }),
    ).toThrow();
  });

  test('discrimina la operación y no acepta un recurso de solo lectura en Push', () => {
    expect(() =>
      SyncPushChangeSchema.parse({
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
        Operation: 'D',
        Data: definition,
      }),
    ).toThrow();

    expect(() =>
      SyncPushChangeSchema.parse({
        Resource: SYNC_RESOURCES.RstTable,
        SyncId: syncId,
        Operation: 'C',
        SyncVersion: '',
        Data: definition,
      }),
    ).toThrow();
  });

  test('rechaza RstTable como recurso de Push', () => {
    expect(() =>
      SyncPushChangeSchema.parse({
        Resource: SYNC_RESOURCES.RstTable,
        SyncId: syncId,
        Operation: 'U',
        Data: definition,
      }),
    ).toThrow();
  });

  test('valida el resultado Conflict con datos del recurso correcto', () => {
    const result = SyncPushResultSchema.parse({
      Resource: SYNC_RESOURCES.GenDefinition,
      SyncId: syncId,
      Status: 'Conflict',
      Message: 'Conflicto',
      Data: definition,
    });
    expect(result.Status).toBe('Conflict');
    expect(
      SyncConflictSchema.parse({
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
        Operation: 'U',
        Message: 'Conflicto',
        LocalData: definition,
        ServerData: definition,
        DetectedAt: '2026-08-31T00:00:00.000Z',
      }).KeepLocal,
    ).toBe(false);
  });

  test('modela la resolución como una decisión discriminada', () => {
    expect(
      SyncConflictResolutionSchema.parse({
        Decision: 'KeepLocal',
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
      }).Decision,
    ).toBe('KeepLocal');
    expect(
      SyncConflictResolutionSchema.parse({
        Decision: 'UseServer',
        Resource: SYNC_RESOURCES.GenDefinition,
        SyncId: syncId,
      }).Decision,
    ).toBe('UseServer');
    expect(() =>
      SyncConflictResolutionSchema.parse({
        Decision: 'KeepLocal',
        Resource: SYNC_RESOURCES.RstTable,
        SyncId: syncId,
      }),
    ).toThrow();
  });

  test('publica JSON Schema de los contratos de integración', () => {
    expect(SyncJsonSchemas.pullResponse).toMatchObject({ type: 'object' });
    expect(SyncJsonSchemas.pushChange).toHaveProperty('oneOf');
    expect(SyncJsonSchemas.pushResponse).toMatchObject({ type: 'object' });
    expect(SyncJsonSchemas.conflictResolution).toHaveProperty('oneOf');
  });
});
