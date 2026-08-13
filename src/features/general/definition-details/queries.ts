import { Q } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel, GenDefinitionModel } from '@/database';
import type {
  GenDefinitionDetailListItem,
  GenDefinitionOption,
} from '@/features/general/definition-details/types';

const toDefinitionOption = (model: GenDefinitionModel): GenDefinitionOption => ({
  DefID: model.DefID,
  DefCode: model.DefCode,
  DefDescription: model.DefDescription,
});

const toListItem = (model: GenDefinitionDetailModel): GenDefinitionDetailListItem => ({
  LocalId: model.id,
  SyncStatus: model.syncStatus,
  DedID: model.DedID,
  DefID: model.DefID,
  DedCode: model.DedCode,
  DedValue: model.DedValue,
  DedDescription: model.DedDescription,
  DedAbbreviation: model.DedAbbreviation,
  DedFormat: model.DedFormat,
  DedGroup: model.DedGroup,
  DedHelper: model.DedHelper,
  DedHelper2: model.DedHelper2,
  DedIcon: model.DedIcon,
  DedColor: model.DedColor,
  DedStated: model.DedStated,
});

export const genDefinitionDetailQueries = {
  observeDefinitions(onNext: (records: GenDefinitionOption[]) => void, onError: (error: unknown) => void) {
    return database
      .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
      .query(Q.where('SecStatus', true), Q.sortBy('DefDescription', Q.asc))
      .observe()
      .subscribe({ next: (records) => onNext(records.map(toDefinitionOption)), error: onError });
  },

  observeActive(onNext: (records: GenDefinitionDetailListItem[]) => void, onError: (error: unknown) => void) {
    return database
      .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
      .query(Q.where('SecStatus', true), Q.sortBy('DedValue', Q.asc))
      .observe()
      .subscribe({ next: (records) => onNext(records.map(toListItem)), error: onError });
  },

  find(LocalId: string) {
    return database.get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail).find(LocalId);
  },

  async existsValue(DefID: number, DedValue: number, excludeLocalId?: string): Promise<boolean> {
    const records = await database
      .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
      .query(Q.where('SecStatus', true), Q.where('DefID', DefID), Q.where('DedValue', DedValue))
      .fetch();
    return records.some((record) => record.id !== excludeLocalId);
  },

  async nextTemporaryId(): Promise<number> {
    const records = await database
      .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
      .query(Q.where('DedID', Q.lt(0)))
      .fetch();
    return Math.min(0, ...records.map((record) => record.DedID)) - 1;
  },
};
