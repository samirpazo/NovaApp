import { field, text } from '@nozbe/watermelondb/decorators';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class RstTableModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.RstTable;

  @field('TabID') TabID: number;
  @field('TabTableNumber') TabTableNumber: number;
  @field('TabCapacity') TabCapacity: number;
  @field('TabStatus') TabStatus: number;
  @field('BrhID') BrhID: number | null;
  @field('TabPosX') TabPosX: number;
  @field('TabPosY') TabPosY: number;
  @field('TabWidth') TabWidth: number;
  @field('TabHeight') TabHeight: number;
  @field('TabRotation') TabRotation: number;
  @text('TabShape') TabShape: string;
  @field('TabZIndex') TabZIndex: number;
}
