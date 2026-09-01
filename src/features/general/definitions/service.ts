import { randomUUID } from 'expo-crypto';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionModel } from '@/database';
import { genDefinitionQueries } from '@/features/general/definitions/queries';
import type { SaveGenDefinitionInput } from '@/features/general/definitions/types';

function normalizeInput(input: SaveGenDefinitionInput) {
  const DefCode = input.DefCode.trim().toUpperCase();
  const DefDescription = input.DefDescription.trim();

  if (!DefCode || !DefDescription) {
    throw new Error('Código y descripción son obligatorios.');
  }

  return { DefCode, DefDescription };
}

export const genDefinitionService = {
  async save(input: SaveGenDefinitionInput): Promise<void> {
    const values = normalizeInput(input);

    if (input.LocalId) {
      const model = await genDefinitionQueries.find(input.LocalId);
      await database.write(() =>
        model.update((record) => {
          record.DefCode = values.DefCode;
          record.DefDescription = values.DefDescription;
          record.DefStated = input.DefStated;
          record.UpdateUserId = input.UserId;
          record.UpdateDate = new Date().toISOString();
        }),
      );
      return;
    }

    const temporaryId = await genDefinitionQueries.nextTemporaryId();
    const syncId = randomUUID();
    const now = new Date().toISOString();

    await database.write(() =>
      database
        .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
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
          record.DefID = temporaryId;
          record.DefCode = values.DefCode;
          record.DefDescription = values.DefDescription;
          record.DefStated = input.DefStated;
        }),
    );
  },

  async remove(LocalId: string, UserId: number): Promise<void> {
    const model = await genDefinitionQueries.find(LocalId);
    await database.write(async () => {
      await model.update((record) => {
        record.DeleteUserId = UserId;
        record.DeleteDate = new Date().toISOString();
      });
      await model.markAsDeleted();
    });
  },
};
