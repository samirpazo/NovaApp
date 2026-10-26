import {
  GenDefinitionDetailSchema,
  GenDefinitionSchema,
  RstBranchSchema,
  RstTableSchema,
  GenCampaignSchema,
  type GenDefinition,
  type GenDefinitionDetail,
  type RstBranch,
  type RstTable,
  type GenCampaign,
} from '@/contracts/entities';
import {
  OagTechnicalVisitSchema,
  OagTechnicalVisitScheduleSchema,
  OagFruitFarmSchema, OagPlotFarmSchema, OagFruitFarmSupervisorSchema,
  OagCultiveSchema, OagVarietySchema, OagFarmSuppliesSchema,
  OagFarmSuppliesTargetSchema, OagPlagueSchema, OagPlagueCultiveSchema,
  OagWaterSourceSchema,
  type OagTechnicalVisit,
  type OagTechnicalVisitSchedule,
  type OagFruitFarm, type OagPlotFarm, type OagFruitFarmSupervisor,
  type OagCultive, type OagVariety, type OagFarmSupplies,
  type OagFarmSuppliesTarget, type OagPlague, type OagPlagueCultive,
  type OagWaterSource,
} from '@/contracts/entities/operationsagr';
import { GuidSchema } from '@/contracts/common';
import { z } from 'zod';

export const SYNC_RESOURCES = {
  GenDefinition: 'GenDefinition',
  GenDefinitionDetail: 'GenDefinitionDetail',
  RstBranch: 'RstBranch',
  RstTable: 'RstTable',
  OagTechnicalVisit: 'OagTechnicalVisit',
  OagTechnicalVisitSchedule: 'OagTechnicalVisitSchedule',
  GenCampaign: 'GenCampaign',
  OagFruitFarm: 'OagFruitFarm',
  OagPlotFarm: 'OagPlotFarm',
  OagFruitFarmSupervisor: 'OagFruitFarmSupervisor',
  OagCultive: 'OagCultive',
  OagVariety: 'OagVariety',
  OagFarmSupplies: 'OagFarmSupplies',
  OagFarmSuppliesTarget: 'OagFarmSuppliesTarget',
  OagPlague: 'OagPlague',
  OagPlagueCultive: 'OagPlagueCultive',
  OagWaterSource: 'OagWaterSource',
} as const;

export const SyncResourceSchema = z.enum([
  SYNC_RESOURCES.GenDefinition,
  SYNC_RESOURCES.GenDefinitionDetail,
  SYNC_RESOURCES.RstBranch,
  SYNC_RESOURCES.RstTable,
  SYNC_RESOURCES.OagTechnicalVisit,
  SYNC_RESOURCES.OagTechnicalVisitSchedule,
  SYNC_RESOURCES.GenCampaign,
  SYNC_RESOURCES.OagFruitFarm,
  SYNC_RESOURCES.OagPlotFarm,
  SYNC_RESOURCES.OagFruitFarmSupervisor,
  SYNC_RESOURCES.OagCultive,
  SYNC_RESOURCES.OagVariety,
  SYNC_RESOURCES.OagFarmSupplies,
  SYNC_RESOURCES.OagFarmSuppliesTarget,
  SYNC_RESOURCES.OagPlague,
  SYNC_RESOURCES.OagPlagueCultive,
  SYNC_RESOURCES.OagWaterSource,
]);
export const SyncOperationSchema = z.enum(['C', 'U', 'D']);

export type SyncResource = z.infer<typeof SyncResourceSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncAccess = 'ReadOnly' | 'ReadWrite';
export type WritableSyncResource = Exclude<SyncResource,
  | 'RstTable' | 'GenCampaign' | 'OagFruitFarm' | 'OagPlotFarm'
  | 'OagFruitFarmSupervisor' | 'OagCultive' | 'OagVariety'
  | 'OagFarmSupplies' | 'OagFarmSuppliesTarget' | 'OagPlague'
  | 'OagPlagueCultive' | 'OagWaterSource'
>;

export interface SyncEntityMap {
  GenDefinition: GenDefinition;
  GenDefinitionDetail: GenDefinitionDetail;
  RstBranch: RstBranch;
  RstTable: RstTable;
  OagTechnicalVisit: OagTechnicalVisit;
  OagTechnicalVisitSchedule: OagTechnicalVisitSchedule;
  GenCampaign: GenCampaign;
  OagFruitFarm: OagFruitFarm;
  OagPlotFarm: OagPlotFarm;
  OagFruitFarmSupervisor: OagFruitFarmSupervisor;
  OagCultive: OagCultive;
  OagVariety: OagVariety;
  OagFarmSupplies: OagFarmSupplies;
  OagFarmSuppliesTarget: OagFarmSuppliesTarget;
  OagPlague: OagPlague;
  OagPlagueCultive: OagPlagueCultive;
  OagWaterSource: OagWaterSource;
}

export const SYNC_ACCESS: Record<SyncResource, SyncAccess> = {
  GenDefinition: 'ReadWrite',
  GenDefinitionDetail: 'ReadWrite',
  RstBranch: 'ReadWrite',
  RstTable: 'ReadOnly',
  OagTechnicalVisit: 'ReadWrite',
  OagTechnicalVisitSchedule: 'ReadWrite',
  GenCampaign: 'ReadOnly',
  OagFruitFarm: 'ReadOnly',
  OagPlotFarm: 'ReadOnly',
  OagFruitFarmSupervisor: 'ReadOnly',
  OagCultive: 'ReadOnly',
  OagVariety: 'ReadOnly',
  OagFarmSupplies: 'ReadOnly',
  OagFarmSuppliesTarget: 'ReadOnly',
  OagPlague: 'ReadOnly',
  OagPlagueCultive: 'ReadOnly',
  OagWaterSource: 'ReadOnly',
};

export interface SyncPullChange<TResource extends SyncResource = SyncResource> {
  Resource: TResource;
  SyncId: string;
  Operation: SyncOperation;
  Data: SyncEntityMap[TResource] | null;
}

export type AnySyncPullChange = {
  [TResource in SyncResource]: SyncPullChange<TResource>;
}[SyncResource];

const syncChangeBase = {
  SyncId: GuidSchema,
  Operation: SyncOperationSchema,
};

export const SyncPullChangeSchema = z.discriminatedUnion('Resource', [
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.GenDefinition),
    Data: GenDefinitionSchema.nullish().transform((value) => value ?? null),
  }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.GenDefinitionDetail),
    Data: GenDefinitionDetailSchema.nullish().transform(
      (value) => value ?? null,
    ),
  }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.RstBranch),
    Data: RstBranchSchema.nullish().transform((value) => value ?? null),
  }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.RstTable),
    Data: RstTableSchema.nullish().transform((value) => value ?? null),
  }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisit),
    Data: OagTechnicalVisitSchema.nullish().transform((value) => value ?? null),
  }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisitSchedule),
    Data: OagTechnicalVisitScheduleSchema.nullish().transform(
      (value) => value ?? null,
    ),
  }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.GenCampaign), Data: GenCampaignSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagFruitFarm), Data: OagFruitFarmSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagPlotFarm), Data: OagPlotFarmSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagFruitFarmSupervisor), Data: OagFruitFarmSupervisorSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagCultive), Data: OagCultiveSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagVariety), Data: OagVarietySchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagFarmSupplies), Data: OagFarmSuppliesSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagFarmSuppliesTarget), Data: OagFarmSuppliesTargetSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagPlague), Data: OagPlagueSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagPlagueCultive), Data: OagPlagueCultiveSchema.nullish().transform((value) => value ?? null) }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.OagWaterSource), Data: OagWaterSourceSchema.nullish().transform((value) => value ?? null) }),
]);

export const SyncPullResponseSchema = z.object({
  Cursor: z.number().int().nonnegative(),
  HasMore: z.boolean(),
  IsBootstrap: z.boolean(),
  Changes: z.array(SyncPullChangeSchema),
});

export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

const syncPushChangeBase = {
  SyncId: GuidSchema,
  Operation: SyncOperationSchema,
  SyncVersion: z.string().nullish(),
  Force: z.boolean().optional(),
};

/**
 * Cada recurso discrimina internamente por Operation.
 * Así C/U nunca pueden viajar sin entidad y D nunca puede llevar un payload.
 */
const pushChangeForResource = <T extends z.ZodType>(
  resource: SyncResource,
  dataSchema: T,
) =>
  z.discriminatedUnion('Operation', [
    z.object({
      ...syncPushChangeBase,
      Resource: z.literal(resource),
      Operation: z.literal('C'),
      Data: dataSchema,
    }),
    z.object({
      ...syncPushChangeBase,
      Resource: z.literal(resource),
      Operation: z.literal('U'),
      Data: dataSchema,
    }),
    z.object({
      ...syncPushChangeBase,
      Resource: z.literal(resource),
      Operation: z.literal('D'),
      Data: z.null(),
    }),
  ]);

export const SyncPushChangeSchema = z.discriminatedUnion('Resource', [
  pushChangeForResource(SYNC_RESOURCES.GenDefinition, GenDefinitionSchema),
  pushChangeForResource(
    SYNC_RESOURCES.GenDefinitionDetail,
    GenDefinitionDetailSchema,
  ),
  pushChangeForResource(SYNC_RESOURCES.RstBranch, RstBranchSchema),
  pushChangeForResource(
    SYNC_RESOURCES.OagTechnicalVisit,
    OagTechnicalVisitSchema,
  ),
  pushChangeForResource(
    SYNC_RESOURCES.OagTechnicalVisitSchedule,
    OagTechnicalVisitScheduleSchema,
  ),
]);

export const SyncPushResultSchema = z.discriminatedUnion('Resource', [
  z.object({
    Resource: z.literal(SYNC_RESOURCES.GenDefinition),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: GenDefinitionSchema.nullish(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.GenDefinitionDetail),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: GenDefinitionDetailSchema.nullish(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.RstBranch),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: RstBranchSchema.nullish(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.RstTable),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: RstTableSchema.nullish(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisit),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: OagTechnicalVisitSchema.nullish(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisitSchedule),
    SyncId: GuidSchema,
    Status: z.enum(['Applied', 'Conflict', 'Rejected']),
    Message: z.string().nullish(),
    Data: OagTechnicalVisitScheduleSchema.nullish(),
  }),
]);

export const SyncPushResponseSchema = z.object({
  Results: z.array(SyncPushResultSchema),
});
export type SyncPushChange = z.infer<typeof SyncPushChangeSchema>;
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;

export const SyncConflictSchema = z.discriminatedUnion('Resource', [
  z.object({
    Resource: z.literal(SYNC_RESOURCES.GenDefinition),
    SyncId: GuidSchema,
    Operation: SyncOperationSchema,
    Message: z.string(),
    LocalData: GenDefinitionSchema.nullable(),
    ServerData: GenDefinitionSchema,
    KeepLocal: z.boolean().default(false),
    DetectedAt: z.string(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.GenDefinitionDetail),
    SyncId: GuidSchema,
    Operation: SyncOperationSchema,
    Message: z.string(),
    LocalData: GenDefinitionDetailSchema.nullable(),
    ServerData: GenDefinitionDetailSchema,
    KeepLocal: z.boolean().default(false),
    DetectedAt: z.string(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.RstBranch),
    SyncId: GuidSchema,
    Operation: SyncOperationSchema,
    Message: z.string(),
    LocalData: RstBranchSchema.nullable(),
    ServerData: RstBranchSchema,
    KeepLocal: z.boolean().default(false),
    DetectedAt: z.string(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisit),
    SyncId: GuidSchema,
    Operation: SyncOperationSchema,
    Message: z.string(),
    LocalData: OagTechnicalVisitSchema.nullable(),
    ServerData: OagTechnicalVisitSchema,
    KeepLocal: z.boolean().default(false),
    DetectedAt: z.string(),
  }),
  z.object({
    Resource: z.literal(SYNC_RESOURCES.OagTechnicalVisitSchedule),
    SyncId: GuidSchema,
    Operation: SyncOperationSchema,
    Message: z.string(),
    LocalData: OagTechnicalVisitScheduleSchema.nullable(),
    ServerData: OagTechnicalVisitScheduleSchema,
    KeepLocal: z.boolean().default(false),
    DetectedAt: z.string(),
  }),
]);

export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export const SyncConflictResolutionSchema = z.discriminatedUnion('Decision', [
  z.object({
    Decision: z.literal('KeepLocal'),
    Resource: z.enum([
      SYNC_RESOURCES.GenDefinition,
      SYNC_RESOURCES.GenDefinitionDetail,
      SYNC_RESOURCES.RstBranch,
      SYNC_RESOURCES.OagTechnicalVisit,
      SYNC_RESOURCES.OagTechnicalVisitSchedule,
    ]),
    SyncId: GuidSchema,
  }),
  z.object({
    Decision: z.literal('UseServer'),
    Resource: z.enum([
      SYNC_RESOURCES.GenDefinition,
      SYNC_RESOURCES.GenDefinitionDetail,
      SYNC_RESOURCES.RstBranch,
      SYNC_RESOURCES.OagTechnicalVisit,
      SYNC_RESOURCES.OagTechnicalVisitSchedule,
    ]),
    SyncId: GuidSchema,
  }),
]);

export type SyncConflictResolution = z.infer<
  typeof SyncConflictResolutionSchema
>;

/** Contratos publicados para documentación y validadores de integraciones externas. */
export const SyncJsonSchemas = {
  // Pull normaliza Data ausente a null en runtime; esa transformación no tiene equivalente JSON Schema.
  pullResponse: z.toJSONSchema(SyncPullResponseSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }),
  pushChange: z.toJSONSchema(SyncPushChangeSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }),
  pushResponse: z.toJSONSchema(SyncPushResponseSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }),
  conflictResolution: z.toJSONSchema(SyncConflictResolutionSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }),
};
