import * as React from 'react';

import type {
  NCrudDataSource,
  NCrudRequest,
  NCrudResult,
  NCrudRow,
} from '@/components/crud/contracts';

const emptyResult = <T>(pageSize: number): NCrudResult<T> => ({
  Data: [],
  TotalCount: 0,
  Page: 1,
  PageSize: pageSize,
  TotalPages: 0,
  HasNext: false,
  HasPrevious: false,
});

export function useNCrudController<
  T extends NCrudRow,
  TFilter extends object,
>(options: {
  dataSource?: NCrudDataSource<T, TFilter>;
  initialFilter: TFilter;
  initialPageSize: number;
}) {
  const { dataSource, initialFilter, initialPageSize } = options;
  const [request, setRequest] = React.useState<NCrudRequest<TFilter>>({
    Page: 1,
    PageSize: initialPageSize,
    SearchText: '',
    OrderBy: null,
    SortOrder: null,
    Filter: initialFilter,
  });
  const [liveSearchText, setLiveSearchText] = React.useState('');
  const [result, setResult] = React.useState(() =>
    emptyResult<T>(initialPageSize),
  );
  const [loading, setLoading] = React.useState(Boolean(dataSource));
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setRequest((current) => ({
        ...current,
        Page: 1,
        SearchText: liveSearchText,
      }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [liveSearchText]);

  React.useEffect(() => {
    if (!dataSource) return;
    setLoading(true);
    const subscription = dataSource.observe(
      request,
      (next) => {
        setResult(next);
        setLoading(false);
        setError(null);
        if (next.Page !== request.Page)
          setRequest((current) => ({ ...current, Page: next.Page }));
      },
      (reason) => {
        setError(reason);
        setLoading(false);
      },
    );
    return () => subscription.unsubscribe();
  }, [dataSource, request]);

  const sort = React.useCallback((column: string) => {
    setRequest((current) => {
      if (current.OrderBy !== column)
        return { ...current, Page: 1, OrderBy: column, SortOrder: 'asc' };
      if (current.SortOrder === 'asc')
        return { ...current, Page: 1, SortOrder: 'desc' };
      return { ...current, Page: 1, OrderBy: null, SortOrder: null };
    });
  }, []);

  const setPage = React.useCallback(
    (Page: number) => setRequest((current) => ({ ...current, Page })),
    [],
  );
  const setPageSize = React.useCallback(
    (PageSize: number) =>
      setRequest((current) => ({ ...current, Page: 1, PageSize })),
    [],
  );
  const setFilter = React.useCallback(
    (Filter: TFilter) =>
      setRequest((current) => ({ ...current, Page: 1, Filter })),
    [],
  );

  return {
    request,
    result,
    loading,
    error,
    liveSearchText,
    setLiveSearchText,
    sort,
    setPage,
    setPageSize,
    setFilter,
  };
}
