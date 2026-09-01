import { Q } from '@nozbe/watermelondb';

import { createLocalCrudDataSource } from '@/components/crud';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel, RstBranchModel } from '@/database';
import type {
  CurrencyOption,
  RstBranchListItem,
} from '@/features/restaurant/branches/types';

const toListItem = (model: RstBranchModel): RstBranchListItem => ({
  id: model.id,
  syncStatus: model.syncStatus,
  BrhID: model.BrhID,
  BrhResID: model.BrhResID,
  BrhName: model.BrhName,
  BrhAddress: model.BrhAddress,
  BrhPhone: model.BrhPhone,
  BrhEmail: model.BrhEmail,
  BrhManagerName: model.BrhManagerName,
  BrhCurrencyDefID: model.BrhCurrencyDefID,
});

export const rstBranchDataSource = createLocalCrudDataSource({
  collection: database.get<RstBranchModel>(SYNC_RESOURCES.RstBranch),
  map: toListItem,
  activeColumn: 'SecStatus',
  searchableColumns: [
    'BrhName',
    'BrhAddress',
    'BrhPhone',
    'BrhEmail',
    'BrhManagerName',
  ],
  sortableColumns: {
    BrhID: 'BrhID',
    BrhName: 'BrhName',
    BrhAddress: 'BrhAddress',
    BrhPhone: 'BrhPhone',
    BrhEmail: 'BrhEmail',
    BrhManagerName: 'BrhManagerName',
  },
  observedColumns: [
    'BrhID',
    'BrhResID',
    'BrhName',
    'BrhAddress',
    'BrhPhone',
    'BrhEmail',
    'BrhManagerName',
    'BrhCurrencyDefID',
    'SecStatus',
  ],
  defaultOrder: { column: 'BrhName', direction: 'asc' },
});

export const rstBranchQueries = {
  observeCurrencies(
    onNext: (records: CurrencyOption[]) => void,
    onError: (error: unknown) => void,
  ) {
    return database
      .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
      .query(
        Q.where('SecStatus', true),
        Q.where('DedCode', 'GEN_CURRENCY'),
        Q.sortBy('DedValue', Q.asc),
      )
      .observe()
      .subscribe({
        next: (details) =>
          onNext(
            details.map((detail) => ({
              value: detail.DedValue,
              text: detail.DedDescription,
            })),
          ),
        error: onError,
      });
  },

  find(LocalId: string) {
    return database.get<RstBranchModel>(SYNC_RESOURCES.RstBranch).find(LocalId);
  },

  observeRestaurantId(
    onNext: (restaurantId: number | null) => void,
    onError: (error: unknown) => void,
  ) {
    return database
      .get<RstBranchModel>(SYNC_RESOURCES.RstBranch)
      .query(Q.where('SecStatus', true), Q.take(1))
      .observeWithColumns(['BrhResID', 'SecStatus'])
      .subscribe({
        next: (records) => onNext(records[0]?.BrhResID ?? null),
        error: onError,
      });
  },

  async nextTemporaryId(): Promise<number> {
    const records = await database
      .get<RstBranchModel>(SYNC_RESOURCES.RstBranch)
      .query(Q.where('BrhID', Q.lt(0)))
      .fetch();
    return Math.min(0, ...records.map((record) => record.BrhID)) - 1;
  },
};
