import { Q } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, RstTableModel } from '@/database';
import type { RstTableListItem } from '@/features/restaurant/tables/types';

const toListItem = (model: RstTableModel): RstTableListItem => ({
  LocalId: model.id,
  SyncStatus: model.syncStatus,
  TabID: model.TabID,
  TabTableNumber: model.TabTableNumber,
  TabCapacity: model.TabCapacity,
  TabStatus: model.TabStatus,
  BrhID: model.BrhID,
  TabShape: model.TabShape,
});

export const rstTableQueries = {
  observeActive(
    onNext: (records: RstTableListItem[]) => void,
    onError: (error: unknown) => void,
  ) {
    return database
      .get<RstTableModel>(SYNC_RESOURCES.RstTable)
      .query(Q.where('SecStatus', true), Q.sortBy('TabTableNumber', Q.asc))
      .observe()
      .subscribe({
        next: (records) => onNext(records.map(toListItem)),
        error: onError,
      });
  },
};
