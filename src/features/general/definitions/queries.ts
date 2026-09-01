import { Q } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionModel } from '@/database';
import { createLocalCrudDataSource } from '@/components/crud';
import type { GenDefinitionListItem } from '@/features/general/definitions/types';

function toListItem(model: GenDefinitionModel): GenDefinitionListItem {
  return {
    id: model.id,
    syncStatus: model.syncStatus,
    DefID: model.DefID,
    DefCode: model.DefCode,
    DefDescription: model.DefDescription,
    DefStated: model.DefStated,
  };
}

export const genDefinitionDataSource = createLocalCrudDataSource({
  collection: database.get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition),
  map: toListItem,
  activeColumn: 'SecStatus',
  searchableColumns: ['DefCode', 'DefDescription'],
  sortableColumns: {
    DefID: 'DefID',
    DefCode: 'DefCode',
    DefDescription: 'DefDescription',
    DefStated: 'DefStated',
  },
  observedColumns: [
    'DefID',
    'DefCode',
    'DefDescription',
    'DefStated',
    'SecStatus',
  ],
  defaultOrder: { column: 'DefDescription', direction: 'asc' },
});

export const genDefinitionQueries = {
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
