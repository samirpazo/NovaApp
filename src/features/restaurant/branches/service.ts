import { randomUUID } from 'expo-crypto';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, RstBranchModel } from '@/database';
import { rstBranchQueries } from '@/features/restaurant/branches/queries';
import type { SaveRstBranchInput } from '@/features/restaurant/branches/types';

const nullable = (value: string) => value.trim() || null;

export const rstBranchService = {
  async save(input: SaveRstBranchInput): Promise<void> {
    const name = input.BrhName.trim();
    if (!name || !input.BrhResID)
      throw new Error('Nombre y restaurante son obligatorios.');

    const apply = (record: RstBranchModel) => {
      record.BrhResID = input.BrhResID;
      record.BrhName = name;
      record.BrhAddress = nullable(input.BrhAddress);
      record.BrhPhone = nullable(input.BrhPhone);
      record.BrhEmail = nullable(input.BrhEmail);
      record.BrhManagerName = nullable(input.BrhManagerName);
      record.BrhCurrencyDefID = input.BrhCurrencyDefID;
    };

    if (input.LocalId) {
      const model = await rstBranchQueries.find(input.LocalId);
      await database.write(() =>
        model.update((record) => {
          apply(record);
          record.UpdateUserId = input.UserId;
          record.UpdateDate = new Date().toISOString();
        }),
      );
      return;
    }

    const temporaryId = await rstBranchQueries.nextTemporaryId();
    const syncId = randomUUID();
    const now = new Date().toISOString();
    await database.write(() =>
      database
        .get<RstBranchModel>(SYNC_RESOURCES.RstBranch)
        .create((record) => {
          record._raw.id = syncId;
          record.SyncId = syncId;
          record.SyncVersion = '';
          record.SecStatus = true;
          record.CreateUserId = input.UserId;
          record.UpdateUserId = input.UserId;
          record.DeleteUserId = null;
          record.CreateDate = now;
          record.UpdateDate = now;
          record.DeleteDate = null;
          record.BrhID = temporaryId;
          apply(record);
        }),
    );
  },

  async remove(LocalId: string): Promise<void> {
    const model = await rstBranchQueries.find(LocalId);
    await database.write(() => model.markAsDeleted());
  },
};
