import { field, text } from '@nozbe/watermelondb/decorators';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class GenDefinitionModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.GenDefinition;

  @field('DefID') DefID!: number;
  @text('DefDescription') DefDescription!: string;
  @text('DefCode') DefCode!: string;
  @field('DefStated') DefStated!: number;
}
