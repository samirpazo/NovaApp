import type { ColumnSchema } from '@nozbe/watermelondb';

export const entityBaseColumns: ColumnSchema[] = [
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
