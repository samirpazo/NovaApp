import { field, text } from '@nozbe/watermelondb/decorators';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class GenDefinitionDetailModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.GenDefinitionDetail;

  @field('DedID') DedID: number;
  @text('DedCode') DedCode: string | null;
  @text('DedDescription') DedDescription: string;
  @field('DedValue') DedValue: number;
  @text('DedAbbreviation') DedAbbreviation: string | null;
  @text('DedFormat') DedFormat: string | null;
  @text('DedHelper') DedHelper: string | null;
  @text('DedHelper2') DedHelper2: string | null;
  @text('DedIcon') DedIcon: string | null;
  @text('DedColor') DedColor: string | null;
  @field('DedStated') DedStated: number;
  @field('DefID') DefID: number;
  @text('DedGroup') DedGroup: string | null;
  // Legacy local value retained during the non-destructive schema migration.
  @text('DedImagePath') DedImagePath: string | null;
  @field('DedImageFilID') DedImageFilID: number | null;
}
