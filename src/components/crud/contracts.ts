import type { SyncStatus } from '@nozbe/watermelondb/Model';

export interface NCrudRow {
  id: string;
  syncStatus: SyncStatus;
}

export type NCrudSortOrder = 'asc' | 'desc';

export interface NCrudRequest<TFilter extends object = Record<string, never>> {
  Page: number;
  PageSize: number;
  SearchText: string;
  OrderBy: string | null;
  SortOrder: NCrudSortOrder | null;
  Filter: TFilter;
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
}
