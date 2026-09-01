import { Q } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel, RstBranchModel } from '@/database';
import type {
  CurrencyOption,
  RstBranchListItem,
} from '@/features/restaurant/branches/types';

const toListItem = (model: RstBranchModel): RstBranchListItem => ({
  LocalId: model.id,
  SyncStatus: model.syncStatus,
  BrhID: model.BrhID,
  BrhResID: model.BrhResID,
  BrhName: model.BrhName,
  BrhAddress: model.BrhAddress,
  BrhPhone: model.BrhPhone,
  BrhEmail: model.BrhEmail,
  BrhManagerName: model.BrhManagerName,
  BrhCurrencyDefID: model.BrhCurrencyDefID,
});

export const rstBranchQueries = {
  observeActive(
    onNext: (records: RstBranchListItem[]) => void,
    onError: (error: unknown) => void,
  ) {
    return database
      .get<RstBranchModel>(SYNC_RESOURCES.RstBranch)
      .query(Q.where('SecStatus', true), Q.sortBy('BrhName', Q.asc))
      .observe()
      .subscribe({
        next: (records) => onNext(records.map(toListItem)),
        error: onError,
      });
  },

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

  async nextTemporaryId(): Promise<number> {
    const records = await database
      .get<RstBranchModel>(SYNC_RESOURCES.RstBranch)
      .query(Q.where('BrhID', Q.lt(0)))
      .fetch();
    return Math.min(0, ...records.map((record) => record.BrhID)) - 1;
  },
};
