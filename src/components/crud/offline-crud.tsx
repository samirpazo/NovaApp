import * as React from 'react';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-react-native';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';

import type {
  NCrudAction,
  NCrudAuthorizationConfig,
  NCrudColumn,
  NCrudColumnVisibility,
  NCrudDataSource,
  NCrudFormConfig,
  NCrudFormContext,
  NCrudFormState,
  NCrudOfflineConfig,
  NCrudRow,
  NCrudSelectionMode,
  NCrudToolbarConfig,
} from '@/components/crud/contracts';
import { NCrudColumnPicker } from '@/components/crud/n-crud-column-picker';
import { deliverNCrudCsv } from '@/components/crud/n-crud-export-file';
import {
  buildNCrudCsv,
  createNCrudExportFileName,
  rowsForNCrudExport,
} from '@/components/crud/n-crud-export';
import { NCrudFilterPanel } from '@/components/crud/n-crud-filter-panel';
import { nCrudFormReducer } from '@/components/crud/n-crud-form-state';
import { NCrudPagination } from '@/components/crud/n-crud-pagination';
import { NCrudOfflineSummary } from '@/components/crud/n-crud-offline-summary';
import { NCrudTable } from '@/components/crud/n-crud-table';
import {
  getNCrudVisibleColumns,
  paginateNCrudRows,
  toggleNCrudRowSelection,
  toggleNCrudVisibleSelection,
} from '@/components/crud/n-crud-table-state';
import { NCrudToolbar } from '@/components/crud/n-crud-toolbar';
import { useNCrudController } from '@/components/crud/use-ncrud-controller';
import {
  createNCrudViewStorageKey,
  parseNCrudViewState,
} from '@/components/crud/n-crud-view-state';
import { NFormPanel } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { storage } from '@/lib/storage';
import { useOptionPermissions } from '@/features/security/options';
import { useSyncConflictState } from '@/sync/conflicts';
import { useSyncState } from '@/sync/state';

export interface NCrudProps<
  T extends NCrudRow,
  TFilter extends object = Record<string, never>,
> {
  title: string;
  form?: NCrudFormConfig<T>;
  rows?: T[];
  dataSource?: NCrudDataSource<T, TFilter>;
  filter?: TFilter;
  extraFilters?: React.ReactNode;
  columns: NCrudColumn<T>[];
  loading?: boolean;
  readOnly?: boolean;
  pageSizes?: number[];
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  toolbar?: Omit<NCrudToolbarConfig<T>, 'extraActions'>;
  extraActions?: NCrudAction<T>[];
  rowActions?: (row: T) => NCrudAction<T>[];
  selectionMode?: NCrudSelectionMode;
  onAdd?: () => void | Promise<void>;
  onEdit?: (row: T) => void | Promise<void>;
  onDelete?: (row: T) => void | Promise<void>;
  onExport?: (rows: T[]) => void | Promise<void>;
  onActionError?: (error: unknown, action: NCrudAction<T>) => void;
  columnsConfigurable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  onColumnVisibilityChange?: (visibility: NCrudColumnVisibility<T>) => void;
  emptyFilter?: TFilter;
  filterActiveCount?: number;
  onResetFilters?: () => void;
  persistenceKey?: string;
  offline?: NCrudOfflineConfig;
  authorization?: NCrudAuthorizationConfig;
}

export function NCrud<
  T extends NCrudRow,
  TFilter extends object = Record<string, never>,
>({
  title,
  form,
  rows = [],
  dataSource,
  filter,
  extraFilters,
  columns,
  loading: externalLoading = false,
  readOnly = false,
  pageSizes = [10, 25, 50, -1],
  searchPlaceholder = 'Buscar...',
  searchText,
  toolbar = {},
  extraActions = [],
  rowActions,
  selectionMode = 'single',
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onActionError,
  columnsConfigurable = true,
  onSelectionChange,
  onColumnVisibilityChange,
  emptyFilter,
  filterActiveCount = 0,
  onResetFilters,
  persistenceKey,
  offline,
  authorization,
}: NCrudProps<T, TFilter>) {
  const compact = useWindowDimensions().width < 768;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [selectedRows, setSelectedRows] = React.useState<T[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<
    NCrudColumnVisibility<T>
  >({});
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewHydrated, setViewHydrated] = React.useState(!persistenceKey);
  const onSelectionChangeRef = React.useRef(onSelectionChange);
  const onColumnVisibilityChangeRef = React.useRef(onColumnVisibilityChange);
  const [formState, dispatchForm] = React.useReducer(nCrudFormReducer<T>, {
    mode: 'closed',
    row: null,
    pending: false,
  } as NCrudFormState<T>);
  const submittingRef = React.useRef(false);
  const initialFilter = React.useMemo(
    () => filter ?? ({} as TFilter),
    [filter],
  );
  const controller = useNCrudController({
    dataSource,
    initialFilter,
    initialPageSize: pageSizes[0] ?? 10,
  });
  const filterSignature = JSON.stringify(filter ?? {});
  const query = controller.liveSearchText;
  const pageSize = controller.request.PageSize;

  const filteredRows = React.useMemo(() => {
    const columnSearched = rows.filter((row) =>
      Object.entries(controller.request.ColumnSearch).every(([key, value]) =>
        String(row[key as keyof T] ?? '')
          .toLocaleLowerCase()
          .includes(value.trim().toLocaleLowerCase()),
      ),
    );
    const needle = controller.request.SearchText.trim().toLocaleLowerCase();
    const searched = needle
      ? columnSearched.filter((row) =>
          (searchText?.(row) ?? JSON.stringify(row))
            .toLocaleLowerCase()
            .includes(needle),
        )
      : columnSearched;
    const { OrderBy, SortOrder } = controller.request;
    if (!OrderBy || !SortOrder) return searched;
    return [...searched].sort((left, right) => {
      const leftValue = left[OrderBy as keyof T];
      const rightValue = right[OrderBy as keyof T];
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
      return SortOrder === 'desc' ? -comparison : comparison;
    });
  }, [controller.request, rows, searchText]);

  const total = dataSource ? controller.result.TotalCount : filteredRows.length;
  const pageCount = dataSource
    ? Math.max(1, controller.result.TotalPages)
    : Math.max(1, Math.ceil(total / pageSize));
  const page = dataSource
    ? controller.result.Page
    : Math.min(controller.request.Page, pageCount);
  const visibleRows = dataSource
    ? controller.result.Data
    : paginateNCrudRows(filteredRows, page, pageSize);
  const selectedIds = selectedRows.map((row) => row.id);
  const visibleColumns = React.useMemo(
    () => getNCrudVisibleColumns(columns, columnVisibility, compact),
    [columnVisibility, columns, compact],
  );
  const loading = externalLoading || controller.loading;
  const syncStatus = useSyncState((state) => state.Status);
  const granted = useOptionPermissions(authorization?.optCode);
  const authorizeAction = React.useCallback(
    (action: NCrudAction<T>): NCrudAction<T> => ({
      ...action,
      permission:
        action.permission !== false &&
        (!authorization ||
          !action.requiredPermission ||
          granted[action.requiredPermission]),
    }),
    [authorization, granted],
  );
  const authorizedExtraActions = React.useMemo(
    () => extraActions.map(authorizeAction),
    [authorizeAction, extraActions],
  );
  const authorizedRowActions = React.useCallback(
    (row: T) => rowActions?.(row).map(authorizeAction) ?? [],
    [authorizeAction, rowActions],
  );
  const conflicts = useSyncConflictState((state) => state.Conflicts);
  const conflictIds = React.useMemo(
    () =>
      offline
        ? conflicts
            .filter((conflict) => conflict.Resource === offline.resource)
            .map((conflict) => conflict.SyncId)
        : [],
    [conflicts, offline],
  );
  const formContext: NCrudFormContext<T> | null =
    formState.mode === 'closed'
      ? null
      : {
          mode: formState.mode,
          row: formState.row,
          pending: formState.pending,
        };

  React.useEffect(() => {
    controller.setFilter(initialFilter);
    // Objects with equivalent contents must not reset pagination every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  React.useEffect(() => {
    if (!persistenceKey) return;
    let active = true;
    void storage
      .getItem(createNCrudViewStorageKey(persistenceKey))
      .then((stored) => {
        if (!active) return;
        const state = parseNCrudViewState(stored);
        if (state) {
          controller.restoreRequest({
            ...state.request,
            Filter: state.request.Filter as TFilter,
          });
          setColumnVisibility(
            state.columnVisibility as NCrudColumnVisibility<T>,
          );
        }
        setViewHydrated(true);
      })
      .catch(() => {
        if (active) setViewHydrated(true);
      });
    return () => {
      active = false;
    };
    // Persistence is restored only when the CRUD identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistenceKey]);

  React.useEffect(() => {
    if (!persistenceKey || !viewHydrated) return;
    const timeout = setTimeout(() => {
      void storage.setItem(
        createNCrudViewStorageKey(persistenceKey),
        JSON.stringify({ request: controller.request, columnVisibility }),
      );
    }, 250);
    return () => clearTimeout(timeout);
  }, [columnVisibility, controller.request, persistenceKey, viewHydrated]);

  React.useEffect(() => {
    setSelectedRows((current) => {
      const next = current.map(
        (selected) =>
          visibleRows.find((row) => row.id === selected.id) ?? selected,
      );
      return next.every((row, index) => row === current[index])
        ? current
        : next;
    });
  }, [visibleRows]);

  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  React.useEffect(() => {
    onColumnVisibilityChangeRef.current = onColumnVisibilityChange;
  }, [onColumnVisibilityChange]);

  React.useEffect(() => {
    onSelectionChangeRef.current?.(selectedRows);
  }, [selectedRows]);

  React.useEffect(() => {
    onColumnVisibilityChangeRef.current?.(columnVisibility);
  }, [columnVisibility]);

  const selectRow = (row: T) => {
    if (selectionMode === 'none') return;
    setSelectedRows((current) =>
      toggleNCrudRowSelection(current, row, selectionMode),
    );
  };

  const selectAllVisible = () => {
    if (selectionMode !== 'multiple') return;
    setSelectedRows((current) =>
      toggleNCrudVisibleSelection(current, visibleRows),
    );
  };

  const toggleColumn = (key: keyof T & string, visible: boolean) => {
    setColumnVisibility((current) => ({ ...current, [key]: visible }));
  };

  const resetFilters = () => {
    controller.clearFilters(emptyFilter ?? ({} as TFilter));
    onResetFilters?.();
  };

  const resetView = () => {
    controller.resetQuery(emptyFilter ?? ({} as TFilter));
    onResetFilters?.();
    setColumnVisibility({});
    setSelectedRows([]);
  };

  const exportRows = async (toolbarSelection: T[]) => {
    if (onExport) {
      await onExport(toolbarSelection);
      return;
    }
    const allFilteredRows = dataSource
      ? (
          await dataSource.fetch({
            ...controller.request,
            Page: 1,
            PageSize: -1,
          })
        ).Data
      : filteredRows;
    const rowsToExport = rowsForNCrudExport(allFilteredRows, toolbarSelection);
    if (!rowsToExport.length)
      throw new Error('No hay registros para exportar.');
    await deliverNCrudCsv(
      buildNCrudCsv(rowsToExport, columns),
      createNCrudExportFileName(title),
    );
  };

  const activeFilterCount =
    filterActiveCount + Object.keys(controller.request.ColumnSearch).length;

  const closeForm = () => {
    if (formState.pending) return;
    form?.onClose?.();
    dispatchForm({ type: 'close' });
  };

  const openAdd = async () => {
    await onAdd?.();
    dispatchForm({ type: 'open-add' });
  };

  const openEdit = async (row: T) => {
    await onEdit?.(row);
    dispatchForm({ type: 'open-edit', row });
  };

  const submitForm = async () => {
    if (!form || !formContext || submittingRef.current) return;
    submittingRef.current = true;
    dispatchForm({ type: 'submit-start' });
    try {
      const result = await form.onSubmit(formContext);
      if (result === false) {
        dispatchForm({ type: 'submit-error' });
        return;
      }
      form.onClose?.();
      dispatchForm({ type: 'submit-success' });
    } catch {
      dispatchForm({ type: 'submit-error' });
    } finally {
      submittingRef.current = false;
    }
  };

  if (form && formContext)
    return (
      <NFormPanel
        title={formContext.mode === 'add' ? form.addTitle : form.editTitle}
        description={form.description}
        onClose={closeForm}
        footer={
          <>
            {form.footer?.(formContext)}
            <View className="flex-1 items-end">
              <Button
                className="h-8 px-3"
                disabled={formContext.pending}
                onPress={() => void submitForm()}
              >
                <Save
                  size={14}
                  className="text-primary-foreground"
                />
                <Text className="text-xs">
                  {formContext.pending
                    ? 'Guardando...'
                    : (form.submitLabel ?? 'Guardar localmente')}
                </Text>
              </Button>
            </View>
          </>
        }
      >
        {form.render(formContext)}
      </NFormPanel>
    );

  return (
    <View
      className="overflow-hidden rounded-lg border border-border bg-card"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <NCrudToolbar
        title={title}
        config={{
          ...toolbar,
          add: !readOnly && toolbar.add,
          edit: !readOnly && toolbar.edit,
          remove: !readOnly && toolbar.remove,
          showSelectionInfo: toolbar.showSelectionInfo ?? true,
          permissions: authorization
            ? {
                add: granted.add && toolbar.permissions?.add !== false,
                edit: granted.edit && toolbar.permissions?.edit !== false,
                remove: granted.remove && toolbar.permissions?.remove !== false,
                export: granted.export && toolbar.permissions?.export !== false,
              }
            : toolbar.permissions,
          extraActions: readOnly ? [] : authorizedExtraActions,
        }}
        selectedRows={selectedRows}
        isMobile={compact}
        searchText={query}
        searchPlaceholder={searchPlaceholder}
        onSearch={controller.setLiveSearchText}
        onAdd={form ? openAdd : onAdd}
        onEdit={form ? openEdit : onEdit}
        onDelete={async (rows) => {
          for (const row of rows) await onDelete?.(row);
          setSelectedRows((current) =>
            current.filter(
              (selected) => !rows.some((row) => row.id === selected.id),
            ),
          );
        }}
        onExport={exportRows}
        onActionError={onActionError}
        tools={
          <View className="flex-row items-center gap-1">
            {columns.some((column) => column.searchable) || extraFilters ? (
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                onPress={() => setFiltersOpen((value) => !value)}
                accessibilityLabel="Mostrar filtros"
              >
                <SlidersHorizontal size={15} />
                {activeFilterCount > 0 ? (
                  <View className="absolute right-0 top-0 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                    <Text className="text-[8px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onPress={resetView}
              accessibilityLabel="Restablecer vista"
            >
              <RotateCcw size={15} />
            </Button>
            {columnsConfigurable ? (
              <NCrudColumnPicker
                columns={columns}
                visibleKeys={visibleColumns.map((column) => column.key)}
                onToggle={toggleColumn}
              />
            ) : null}
          </View>
        }
      />

      {offline && offline.showSummary !== false ? (
        <NCrudOfflineSummary resource={offline.resource} />
      ) : null}

      {filtersOpen ? (
        <NCrudFilterPanel
          columns={columns}
          values={controller.request.ColumnSearch}
          customFilters={extraFilters}
          onChange={controller.setColumnSearch}
          onReset={resetFilters}
        />
      ) : null}

      {controller.error ? (
        <View className="border-b border-destructive/30 bg-destructive/10 p-3">
          <Text className="text-xs text-destructive">
            No se pudieron cargar los datos locales.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="h-40 items-center justify-center gap-2">
          <ActivityIndicator />
          <Text className="text-xs text-muted-foreground">Cargando...</Text>
        </View>
      ) : (
        <NCrudTable
          rows={visibleRows}
          columns={visibleColumns}
          compact={compact}
          containerWidth={containerWidth}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          onSelect={selectRow}
          onSelectAll={selectAllVisible}
          orderBy={controller.request.OrderBy}
          sortOrder={controller.request.SortOrder}
          onSort={controller.sort}
          rowActions={rowActions ? authorizedRowActions : undefined}
          conflictIds={conflictIds}
          syncing={syncStatus === 'syncing'}
        />
      )}

      <NCrudPagination
        page={page}
        pageSize={pageSize}
        pageCount={pageCount}
        total={total}
        pageSizes={pageSizes}
        onPageChange={controller.setPage}
        onPageSizeChange={controller.setPageSize}
      />
    </View>
  );
}
