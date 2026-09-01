import {
  GenDefinitionDetailSchema,
  GenDefinitionSchema,
  RstBranchSchema,
  RstTableSchema,
  type GenDefinition,
  type GenDefinitionDetail,
  type RstBranch,
  type RstTable,
} from '@/contracts/entities';
import { GuidSchema } from '@/contracts/common';
import { z } from 'zod';

export const SYNC_RESOURCES = {
  GenDefinition: 'GenDefinition',
  GenDefinitionDetail: 'GenDefinitionDetail',
  RstBranch: 'RstBranch',
  RstTable: 'RstTable',
} as const;

export const SyncResourceSchema = z.enum([
  SYNC_RESOURCES.GenDefinition,
  SYNC_RESOURCES.GenDefinitionDetail,
  SYNC_RESOURCES.RstBranch,
  SYNC_RESOURCES.RstTable,
]);
export const SyncOperationSchema = z.enum(['C', 'U', 'D']);

export type SyncResource = z.infer<typeof SyncResourceSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncAccess = 'ReadOnly' | 'ReadWrite';
export type WritableSyncResource = Exclude<SyncResource, 'RstTable'>;

export interface SyncEntityMap {
  GenDefinition: GenDefinition;
  GenDefinitionDetail: GenDefinitionDetail;
  RstBranch: RstBranch;
  RstTable: RstTable;
}

export const SYNC_ACCESS: Record<SyncResource, SyncAccess> = {
  GenDefinition: 'ReadWrite',
  GenDefinitionDetail: 'ReadWrite',
  RstBranch: 'ReadWrite',
  RstTable: 'ReadOnly',
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
    Data: GenDefinitionDetailSchema.nullish().transform((value) => value ?? null),
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
  pushChangeForResource(SYNC_RESOURCES.GenDefinitionDetail, GenDefinitionDetailSchema),
  pushChangeForResource(SYNC_RESOURCES.RstBranch, RstBranchSchema),
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
]);

export const SyncPushResponseSchema = z.object({ Results: z.array(SyncPushResultSchema) });
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
]);

export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export const SyncConflictResolutionSchema = z.discriminatedUnion('Decision', [
  z.object({
    Decision: z.literal('KeepLocal'),
    Resource: z.enum([
      SYNC_RESOURCES.GenDefinition,
      SYNC_RESOURCES.GenDefinitionDetail,
      SYNC_RESOURCES.RstBranch,
    ]),
    SyncId: GuidSchema,
  }),
  z.object({
    Decision: z.literal('UseServer'),
    Resource: z.enum([
      SYNC_RESOURCES.GenDefinition,
      SYNC_RESOURCES.GenDefinitionDetail,
      SYNC_RESOURCES.RstBranch,
    ]),
    SyncId: GuidSchema,
  }),
]);

export type SyncConflictResolution = z.infer<typeof SyncConflictResolutionSchema>;

/** Contratos publicados para documentación y validadores de integraciones externas. */
export const SyncJsonSchemas = {
  // Pull normaliza Data ausente a null en runtime; esa transformación no tiene equivalente JSON Schema.
  pullResponse: z.toJSONSchema(SyncPullResponseSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }),
  pushChange: z.toJSONSchema(SyncPushChangeSchema, { target: 'draft-2020-12', unrepresentable: 'any' }),
  pushResponse: z.toJSONSchema(SyncPushResponseSchema, { target: 'draft-2020-12', unrepresentable: 'any' }),
  conflictResolution: z.toJSONSchema(SyncConflictResolutionSchema, { target: 'draft-2020-12', unrepresentable: 'any' }),
};
