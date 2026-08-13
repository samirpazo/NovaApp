import type { SyncStatus } from '@nozbe/watermelondb/Model';

export interface GenDefinitionListItem {
  LocalId: string;
  SyncStatus: SyncStatus;
  DefID: number;
  DefCode: string;
  DefDescription: string;
  DefStated: number;
}

export interface SaveGenDefinitionInput {
  LocalId?: string;
  DefCode: string;
  DefDescription: string;
  DefStated: number;
  UserId: number;
}
