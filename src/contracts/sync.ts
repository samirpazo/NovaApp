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
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.GenDefinition), Data: GenDefinitionSchema.nullable() }),
  z.object({
    ...syncChangeBase,
    Resource: z.literal(SYNC_RESOURCES.GenDefinitionDetail),
    Data: GenDefinitionDetailSchema.nullable(),
  }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.RstBranch), Data: RstBranchSchema.nullable() }),
  z.object({ ...syncChangeBase, Resource: z.literal(SYNC_RESOURCES.RstTable), Data: RstTableSchema.nullable() }),
]);

export const SyncPullResponseSchema = z.object({
  Cursor: z.number().int().nonnegative(),
  HasMore: z.boolean(),
  IsBootstrap: z.boolean(),
  Changes: z.array(SyncPullChangeSchema),
});

export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

export const SyncPushChangeSchema = z.object({
  Resource: SyncResourceSchema,
  SyncId: GuidSchema,
  Operation: SyncOperationSchema,
  SyncVersion: z.string().nullish(),
  Data: z.record(z.string(), z.unknown()).nullable(),
});

export const SyncPushResultSchema = z.object({
  Resource: SyncResourceSchema,
  SyncId: GuidSchema,
  Status: z.enum(['Applied', 'Conflict', 'Rejected']),
  Message: z.string().nullish(),
  Data: z.unknown().nullish(),
});

export const SyncPushResponseSchema = z.object({ Results: z.array(SyncPushResultSchema) });
export type SyncPushChange = z.infer<typeof SyncPushChangeSchema>;
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;
