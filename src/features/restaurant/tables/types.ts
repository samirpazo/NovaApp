import type { SyncStatus } from '@nozbe/watermelondb/Model';

export interface RstTableListItem {
  LocalId: string;
  SyncStatus: SyncStatus;
  TabID: number;
  TabTableNumber: number;
  TabCapacity: number;
  TabStatus: number;
  BrhID: number | null;
  TabShape: string;
}
