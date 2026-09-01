import { Q, type Model } from '@nozbe/watermelondb';
import type Collection from '@nozbe/watermelondb/Collection';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';

import type {
  NCrudDataSource,
  NCrudResult,
  NCrudSortOrder,
} from '@/components/crud/contracts';

interface LocalCrudOrder {
  column: string;
  direction: NCrudSortOrder;
}

interface LocalCrudDataSourceConfig<
  TModel extends Model,
  TRow,
  TFilter extends object,
> {
  collection: Collection<TModel>;
  map: (model: TModel) => TRow;
  searchableColumns?: string[];
  sortableColumns: Record<string, string>;
  observedColumns: string[];
  defaultOrder: LocalCrudOrder;
  activeColumn?: string;
  buildFilter?: (filter: TFilter) => Clause[];
}

function searchClauses(columns: string[], searchText: string): Clause[] {
  const value = Q.sanitizeLikeString(searchText.trim());
  if (!value || !columns.length) return [];
  return [
    Q.or(...columns.map((column) => Q.where(column, Q.like(`%${value}%`)))),
  ];
}

function columnSearchClauses(
  allowedColumns: string[],
  values: Record<string, string>,
): Clause[] {
  return Object.entries(values).flatMap(([column, searchText]) => {
    if (!allowedColumns.includes(column)) return [];
    const value = Q.sanitizeLikeString(searchText.trim());
    return value ? [Q.where(column, Q.like(`%${value}%`))] : [];
  });
}

function resultFor<T>(
  Data: T[],
  TotalCount: number,
  Page: number,
  PageSize: number,
): NCrudResult<T> {
  const TotalPages =
    PageSize === -1
      ? TotalCount > 0
        ? 1
        : 0
      : Math.ceil(TotalCount / PageSize);
  return {
    Data,
    TotalCount,
    Page,
    PageSize,
    TotalPages,
    HasNext: Page < TotalPages,
    HasPrevious: Page > 1,
  };
}

export function createLocalCrudDataSource<
  TModel extends Model,
  TRow,
  TFilter extends object = Record<string, never>,
>(
  config: LocalCrudDataSourceConfig<TModel, TRow, TFilter>,
): NCrudDataSource<TRow, TFilter> {
  return {
    async fetch(request) {
      const baseClauses: Clause[] = [
        ...(config.activeColumn ? [Q.where(config.activeColumn, true)] : []),
        ...searchClauses(config.searchableColumns ?? [], request.SearchText),
        ...columnSearchClauses(
          config.searchableColumns ?? [],
          request.ColumnSearch,
        ),
        ...(config.buildFilter?.(request.Filter) ?? []),
      ];
      const TotalCount = await config.collection
        .query(...baseClauses)
        .fetchCount();
      const requestedPage = Math.max(1, request.Page);
      const TotalPages =
        request.PageSize === -1
          ? 1
          : Math.max(1, Math.ceil(TotalCount / request.PageSize));
      const Page = Math.min(requestedPage, TotalPages);
      const selectedColumn = request.OrderBy
        ? config.sortableColumns[request.OrderBy]
        : undefined;
      const order = selectedColumn
        ? {
            column: selectedColumn,
            direction: request.SortOrder ?? 'asc',
          }
        : config.defaultOrder;
      const records = await config.collection
        .query(
          ...baseClauses,
          Q.sortBy(order.column, order.direction === 'desc' ? Q.desc : Q.asc),
          ...(request.PageSize === -1
            ? []
            : [
                Q.skip((Page - 1) * request.PageSize),
                Q.take(request.PageSize),
              ]),
        )
        .fetch();
      return resultFor(
        records.map(config.map),
        TotalCount,
        Page,
        request.PageSize,
      );
    },
    observe(request, onNext, onError) {
      let rowsSubscription: { unsubscribe(): void } | null = null;
      let disposed = false;

      const baseClauses: Clause[] = [
        ...(config.activeColumn ? [Q.where(config.activeColumn, true)] : []),
        ...searchClauses(config.searchableColumns ?? [], request.SearchText),
        ...columnSearchClauses(
          config.searchableColumns ?? [],
          request.ColumnSearch,
        ),
        ...(config.buildFilter?.(request.Filter) ?? []),
      ];

      const countSubscription = config.collection
        .query(...baseClauses)
        .observeCount(false)
        .subscribe({
          next: (TotalCount) => {
            rowsSubscription?.unsubscribe();
            if (disposed) return;

            const requestedPage = Math.max(1, request.Page);
            const TotalPages =
              request.PageSize === -1
                ? 1
                : Math.max(1, Math.ceil(TotalCount / request.PageSize));
            const Page = Math.min(requestedPage, TotalPages);
            const selectedColumn = request.OrderBy
              ? config.sortableColumns[request.OrderBy]
              : undefined;
            const order = selectedColumn
              ? {
                  column: selectedColumn,
                  direction: request.SortOrder ?? 'asc',
                }
              : config.defaultOrder;
            const pageClauses: Clause[] = [
              ...baseClauses,
              Q.sortBy(
                order.column,
                order.direction === 'desc' ? Q.desc : Q.asc,
              ),
              ...(request.PageSize === -1
                ? []
                : [
                    Q.skip((Page - 1) * request.PageSize),
                    Q.take(request.PageSize),
                  ]),
            ];

            rowsSubscription = config.collection
              .query(...pageClauses)
              .observeWithColumns(config.observedColumns)
              .subscribe({
                next: (records) =>
                  onNext(
                    resultFor(
                      records.map(config.map),
                      TotalCount,
                      Page,
                      request.PageSize,
                    ),
                  ),
                error: onError,
              });
          },
          error: onError,
        });

      return {
        unsubscribe() {
          disposed = true;
          rowsSubscription?.unsubscribe();
          countSubscription.unsubscribe();
        },
      };
    },
  };
}
