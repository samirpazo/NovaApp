import { randomUUID } from 'expo-crypto';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, GenDefinitionDetailModel } from '@/database';
import { genDefinitionDetailQueries } from '@/features/general/definition-details/queries';
import type { SaveGenDefinitionDetailInput } from '@/features/general/definition-details/types';

const nullable = (value: string) => value.trim() || null;

export const genDefinitionDetailService = {
  async save(input: SaveGenDefinitionDetailInput): Promise<void> {
    const description = input.DedDescription.trim();
    if (
      !Number.isInteger(input.DedValue) ||
      input.DedValue < 0 ||
      !description
    ) {
      throw new Error('Definición, valor y descripción son obligatorios.');
    }
    if (
      await genDefinitionDetailQueries.existsValue(
        input.Definition.DefID,
        input.DedValue,
        input.LocalId,
      )
    ) {
      throw new Error(
        `El valor ${input.DedValue} ya existe en esta definición.`,
      );
    }

    const apply = (record: GenDefinitionDetailModel) => {
      record.DefID = input.Definition.DefID;
      record.DedCode = input.Definition.DefCode;
      record.DedValue = input.DedValue;
      record.DedDescription = description;
      record.DedAbbreviation = nullable(input.DedAbbreviation);
      record.DedFormat = nullable(input.DedFormat);
      record.DedGroup = nullable(input.DedGroup);
      record.DedHelper = nullable(input.DedHelper);
      record.DedHelper2 = nullable(input.DedHelper2);
      record.DedIcon = nullable(input.DedIcon);
      record.DedColor = nullable(input.DedColor);
      record.DedStated = input.DedStated;
      record.DedImageFilID = input.DedImageFilID;
    };

    if (input.LocalId) {
      const model = await genDefinitionDetailQueries.find(input.LocalId);
      await database.write(() =>
        model.update((record) => {
          apply(record);
          record.UpdateUserId = input.UserId;
          record.UpdateDate = new Date().toISOString();
        }),
      );
      return;
    }

    const temporaryId = await genDefinitionDetailQueries.nextTemporaryId();
    const syncId = randomUUID();
    const now = new Date().toISOString();
    await database.write(() =>
      database
        .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
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
          record.DedID = temporaryId;
          apply(record);
        }),
    );
  },

  async remove(LocalId: string): Promise<void> {
    const model = await genDefinitionDetailQueries.find(LocalId);
    await database.write(() => model.markAsDeleted());
  },
};
