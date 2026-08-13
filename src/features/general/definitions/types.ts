import type { SyncStatus } from '@nozbe/watermelondb/Model';

export interface GenDefinitionListItem {
  id: string;
  syncStatus: SyncStatus;
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
