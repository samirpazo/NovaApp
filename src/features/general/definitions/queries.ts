import { Q } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionModel } from '@/database';
import type { GenDefinitionListItem } from '@/features/general/definitions/types';

function toListItem(model: GenDefinitionModel): GenDefinitionListItem {
  return {
    LocalId: model.id,
    SyncStatus: model.syncStatus,
    DefID: model.DefID,
    DefCode: model.DefCode,
    DefDescription: model.DefDescription,
    DefStated: model.DefStated,
  };
}

export const genDefinitionQueries = {
  observeActive(
    onNext: (records: GenDefinitionListItem[]) => void,
    onError: (error: unknown) => void,
  ) {
    return database
      .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
      .query(Q.where('SecStatus', true), Q.sortBy('DefDescription', Q.asc))
      .observe()
      .subscribe({
        next: (records) => onNext(records.map(toListItem)),
        error: onError,
      });
  },

  find(LocalId: string) {
    return database
      .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
      .find(LocalId);
  },

  async nextTemporaryId(): Promise<number> {
    const records = await database
      .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
      .query(Q.where('DefID', Q.lt(0)))
      .fetch();

    return Math.min(0, ...records.map((record) => record.DefID)) - 1;
  },
};
