import type { SyncStatus } from '@nozbe/watermelondb/Model';
import type { ComponentType, ReactNode } from 'react';

import type { SyncResource } from '@/contracts/sync';

export interface NCrudRow {
  id: string;
  syncStatus: SyncStatus;
}

export type NCrudSortOrder = 'asc' | 'desc';

export type NCrudSelectionMode = 'none' | 'single' | 'multiple';

export type NCrudActionKind = 'add' | 'edit' | 'delete' | 'export' | 'custom';

export type NCrudActionPlacement = 'toolbar' | 'row' | 'bulk';

export type NCrudActionTone = 'default' | 'primary' | 'success' | 'destructive';

export interface NCrudAction<T extends NCrudRow = NCrudRow> {
  id: string;
  label: string;
  kind: NCrudActionKind;
  placement?: NCrudActionPlacement;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: NCrudActionTone;
  permission?: boolean;
  requiredPermission?: 'add' | 'edit' | 'remove' | 'export' | 'manage';
  minSelection?: number;
  maxSelection?: number;
  disabled?: boolean | ((rows: T[]) => boolean);
  visible?: boolean | ((rows: T[]) => boolean);
  confirmation?: string | ((rows: T[]) => { title: string; message: string });
  onPress: (rows: T[]) => void | Promise<void>;
}

/** Column contract rendered by NCrudTable. */
export interface NCrudColumn<T extends NCrudRow = NCrudRow> {
  key: keyof T & string;
  title: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  format?: (row: T) => ReactNode;
  sortable?: boolean;
  hidden?: boolean;
  mobileHidden?: boolean;
  hideable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  /** Plain value used by CSV export; UI formatters may return React elements. */
  exportFormat?: (row: T) => string | number | boolean | null | undefined;
}

export type NCrudColumnVisibility<T extends NCrudRow = NCrudRow> = Partial<
  Record<keyof T & string, boolean>
>;

export interface NCrudOfflineConfig {
  resource: SyncResource;
  /** Shows the shared synchronization summary above the local table. */
  showSummary?: boolean;
}

export interface NCrudConfig<
  T extends NCrudRow = NCrudRow,
  TFilter extends object = Record<string, never>,
> {
  dataSource?: NCrudDataSource<T, TFilter>;
  columns: NCrudColumn<T>[];
}

export interface NCrudAuthorizationConfig {
  /** Must match the backend RequireOption code. */
  optCode: string;
}

export interface NCrudToolbarConfig<T extends NCrudRow = NCrudRow> {
  add?: boolean;
  edit?: boolean;
  remove?: boolean;
  export?: boolean;
  search?: boolean;
  searchInput?: boolean;
  showSelectionInfo?: boolean;
  permissions?: {
    add?: boolean;
    edit?: boolean;
    remove?: boolean;
    export?: boolean;
  };
  extraActions?: NCrudAction<T>[];
}

export interface NCrudFormState<T extends NCrudRow = NCrudRow> {
  mode: 'closed' | 'add' | 'edit';
  row: T | null;
  pending: boolean;
}

export interface NCrudFormContext<T extends NCrudRow = NCrudRow> {
  mode: 'add' | 'edit';
  row: T | null;
  pending: boolean;
}

export interface NCrudFormConfig<T extends NCrudRow = NCrudRow> {
  addTitle: string;
  editTitle: string;
  description?: string | null;
  render: (context: NCrudFormContext<T>) => ReactNode;
  footer?: (context: NCrudFormContext<T>) => ReactNode;
  onSubmit: (
    context: NCrudFormContext<T>,
  ) => boolean | void | Promise<boolean | void>;
  onClose?: () => void;
  submitLabel?: string;
}

export interface NCrudRequest<TFilter extends object = Record<string, never>> {
  Page: number;
  PageSize: number;
  SearchText: string;
  ColumnSearch: Record<string, string>;
  OrderBy: string | null;
  SortOrder: NCrudSortOrder | null;
  Filter: TFilter;
}

export interface NCrudPersistedViewState<
  TFilter extends object = Record<string, never>,
> {
  request: NCrudRequest<TFilter>;
  columnVisibility: Record<string, boolean>;
}

export interface NCrudResult<T> {
  Data: T[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

export interface NCrudSubscription {
  unsubscribe(): void;
}

export interface NCrudDataSource<
  T,
  TFilter extends object = Record<string, never>,
> {
  observe(
    request: NCrudRequest<TFilter>,
    onNext: (result: NCrudResult<T>) => void,
    onError: (error: unknown) => void,
  ): NCrudSubscription;
  fetch(request: NCrudRequest<TFilter>): Promise<NCrudResult<T>>;
}
