import { createLocalCrudDataSource } from '@/components/crud';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, RstTableModel } from '@/database';
import type { RstTableListItem } from '@/features/restaurant/tables/types';

const toListItem = (model: RstTableModel): RstTableListItem => ({
  id: model.id,
  syncStatus: model.syncStatus,
  TabID: model.TabID,
  TabTableNumber: model.TabTableNumber,
  TabCapacity: model.TabCapacity,
  TabStatus: model.TabStatus,
  BrhID: model.BrhID,
  TabShape: model.TabShape,
});

export const rstTableDataSource = createLocalCrudDataSource({
  collection: database.get<RstTableModel>(SYNC_RESOURCES.RstTable),
  map: toListItem,
  activeColumn: 'SecStatus',
  searchableColumns: ['TabShape'],
  sortableColumns: {
    TabID: 'TabID',
    TabTableNumber: 'TabTableNumber',
    TabCapacity: 'TabCapacity',
    TabStatus: 'TabStatus',
    BrhID: 'BrhID',
    TabShape: 'TabShape',
  },
  observedColumns: [
    'TabID',
    'TabTableNumber',
    'TabCapacity',
    'TabStatus',
    'BrhID',
    'TabShape',
    'SecStatus',
  ],
  defaultOrder: { column: 'TabTableNumber', direction: 'asc' },
});
