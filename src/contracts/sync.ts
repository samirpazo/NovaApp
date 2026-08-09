import type { GenDefinition, GenDefinitionDetail, RstBranch, RstTable } from '@/contracts/entities';

export const SYNC_RESOURCES = {
  GenDefinition: 'GenDefinition',
  GenDefinitionDetail: 'GenDefinitionDetail',
  RstBranch: 'RstBranch',
  RstTable: 'RstTable',
} as const;

export type SyncResource = (typeof SYNC_RESOURCES)[keyof typeof SYNC_RESOURCES];
export type SyncOperation = 'C' | 'U' | 'D';
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

export interface SyncPullResponse {
  Cursor: number;
  HasMore: boolean;
  IsBootstrap: boolean;
  Changes: AnySyncPullChange[];
}
