import { appSchema, tableSchema, type ColumnSchema } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';

const entityBaseColumns: ColumnSchema[] = [
  { name: 'SyncId', type: 'string', isIndexed: true },
  { name: 'SyncVersion', type: 'string' },
  { name: 'SecStatus', type: 'boolean' },
  { name: 'CreateUserId', type: 'number' },
  { name: 'UpdateUserId', type: 'number', isOptional: true },
  { name: 'DeleteUserId', type: 'number', isOptional: true },
  { name: 'CreateDate', type: 'string' },
  { name: 'UpdateDate', type: 'string', isOptional: true },
  { name: 'DeleteDate', type: 'string', isOptional: true },
];

export const databaseSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: SYNC_RESOURCES.GenDefinition,
      columns: [
        ...entityBaseColumns,
        { name: 'DefID', type: 'number', isIndexed: true },
        { name: 'DefDescription', type: 'string' },
        { name: 'DefCode', type: 'string' },
        { name: 'DefStated', type: 'number' },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.GenDefinitionDetail,
      columns: [
        ...entityBaseColumns,
        { name: 'DedID', type: 'number', isIndexed: true },
        { name: 'DedCode', type: 'string', isOptional: true },
        { name: 'DedDescription', type: 'string' },
        { name: 'DedValue', type: 'number' },
        { name: 'DedAbbreviation', type: 'string', isOptional: true },
        { name: 'DedFormat', type: 'string', isOptional: true },
        { name: 'DedHelper', type: 'string', isOptional: true },
        { name: 'DedHelper2', type: 'string', isOptional: true },
        { name: 'DedIcon', type: 'string', isOptional: true },
        { name: 'DedColor', type: 'string', isOptional: true },
        { name: 'DedStated', type: 'number' },
        { name: 'DefID', type: 'number', isIndexed: true },
        { name: 'DedGroup', type: 'string', isOptional: true },
        { name: 'DedImagePath', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.RstBranch,
      columns: [
        ...entityBaseColumns,
        { name: 'BrhID', type: 'number', isIndexed: true },
        { name: 'BrhResID', type: 'number' },
        { name: 'BrhName', type: 'string' },
        { name: 'BrhAddress', type: 'string', isOptional: true },
        { name: 'BrhPhone', type: 'string', isOptional: true },
        { name: 'BrhEmail', type: 'string', isOptional: true },
        { name: 'BrhManagerName', type: 'string', isOptional: true },
        { name: 'BrhCurrencyDefID', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.RstTable,
      columns: [
        ...entityBaseColumns,
        { name: 'TabID', type: 'number', isIndexed: true },
        { name: 'TabTableNumber', type: 'number' },
        { name: 'TabCapacity', type: 'number' },
        { name: 'TabStatus', type: 'number' },
        { name: 'BrhID', type: 'number', isOptional: true, isIndexed: true },
        { name: 'TabPosX', type: 'number' },
        { name: 'TabPosY', type: 'number' },
        { name: 'TabWidth', type: 'number' },
        { name: 'TabHeight', type: 'number' },
        { name: 'TabRotation', type: 'number' },
        { name: 'TabShape', type: 'string' },
        { name: 'TabZIndex', type: 'number' },
      ],
    }),
  ],
});
