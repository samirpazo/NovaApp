import { field, text } from '@nozbe/watermelondb/decorators';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class RstBranchModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.RstBranch;

  @field('BrhID') BrhID!: number;
  @field('BrhResID') BrhResID!: number;
  @text('BrhName') BrhName!: string;
  @text('BrhAddress') BrhAddress!: string | null;
  @text('BrhPhone') BrhPhone!: string | null;
  @text('BrhEmail') BrhEmail!: string | null;
  @text('BrhManagerName') BrhManagerName!: string | null;
  @field('BrhCurrencyDefID') BrhCurrencyDefID!: number | null;
}
