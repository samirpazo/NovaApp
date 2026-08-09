import { field, text } from '@nozbe/watermelondb/decorators';
import { Model } from '@nozbe/watermelondb';

export abstract class EntityBaseModel extends Model {
  @text('SyncId') SyncId!: string;
  @text('SyncVersion') SyncVersion!: string;
  @field('SecStatus') SecStatus!: boolean;
  @field('CreateUserId') CreateUserId!: number;
  @field('UpdateUserId') UpdateUserId!: number | null;
  @field('DeleteUserId') DeleteUserId!: number | null;
  @text('CreateDate') CreateDate!: string;
  @text('UpdateDate') UpdateDate!: string | null;
  @text('DeleteDate') DeleteDate!: string | null;
}
