import type { SyncStatus } from '@nozbe/watermelondb/Model';
import { ArrowDown, ArrowUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronsUpDown, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { NCrudDataSource, NCrudRow } from '@/components/crud/contracts';
import { useNCrudController } from '@/components/crud/use-ncrud-controller';
import { cn } from '@/lib/utils';

export interface NCrudColumn<T extends NCrudRow> {
  key: keyof T & string;
  title: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  format?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface NCrudProps<T extends NCrudRow, TFilter extends object = Record<string, never>> {
  title: string;
  form?: React.ReactNode;
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
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

const labels: Record<SyncStatus, string> = {
  synced: 'Sincronizado', created: 'Nuevo local', updated: 'Editado local',
  deleted: 'Eliminado', disposable: 'Temporal',
};
const colors: Record<SyncStatus, string> = {
  synced: 'bg-success', created: 'bg-primary', updated: 'bg-warning',
  deleted: 'bg-destructive', disposable: 'bg-muted-foreground',
};

function cell<T extends NCrudRow>(row: T, column: NCrudColumn<T>) {
  if (column.format) return column.format(row);
  const value = row[column.key];
  return value == null ? '-' : String(value);
}

function CellContent<T extends NCrudRow>({ row, column }: { row: T; column: NCrudColumn<T> }) {
  const content = cell(row, column);
  if (typeof content === 'string' || typeof content === 'number') {
    return <Text numberOfLines={1} className="text-xs">{content}</Text>;
  }
  return content;
}

export function NCrud<T extends NCrudRow, TFilter extends object = Record<string, never>>({
  title, form, rows = [], dataSource, filter, extraFilters, columns, loading: externalLoading = false, readOnly = false, pageSizes = [10, 25, 50],
  searchPlaceholder = 'Buscar...', searchText, onAdd, onEdit, onDelete,
}: NCrudProps<T>) {
  const compact = useWindowDimensions().width < 768;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [pageSizeOpen, setPageSizeOpen] = React.useState(false);
  const initialFilter = React.useMemo(() => filter ?? ({} as TFilter), [filter]);
  const controller = useNCrudController({ dataSource, initialFilter, initialPageSize: pageSizes[0] ?? 10 });
  const filterSignature = JSON.stringify(filter ?? {});
  const query = controller.liveSearchText;
  const pageSize = controller.request.PageSize;
  const filtered = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const searched = needle ? rows.filter((row) => (searchText?.(row) ?? JSON.stringify(row)).toLocaleLowerCase().includes(needle)) : rows;
    const { OrderBy, SortOrder } = controller.request;
    if (!OrderBy || !SortOrder) return searched;
    return [...searched].sort((left, right) => {
      const a = left[OrderBy as keyof T];
      const b = right[OrderBy as keyof T];
      const compared = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a ?? '').localeCompare(String(b ?? ''));
      return SortOrder === 'desc' ? -compared : compared;
    });
  }, [controller.request, query, rows, searchText]);
  const totalRecords = dataSource ? controller.result.TotalCount : filtered.length;
  const totalPages = dataSource ? Math.max(1, controller.result.TotalPages) : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = dataSource ? controller.result.Page : Math.min(controller.request.Page, totalPages);
  const visible = dataSource ? controller.result.Data : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = visible.find((row) => row.id === selectedId) ?? null;
  const loading = externalLoading || controller.loading;

  React.useEffect(() => {
    controller.setFilter(initialFilter);
  // El contenido serializado evita reiniciar la página por objetos equivalentes recreados al renderizar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  React.useEffect(() => {
    if (selectedId && !visible.some((row) => row.id === selectedId)) setSelectedId(null);
  }, [visible, selectedId]);

  const select = (row: T) => setSelectedId((value) => value === row.id ? null : row.id);
  const from = totalRecords ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, totalRecords);

  const SortIcon = ({ column }: { column: string }) => {
    if (controller.request.OrderBy !== column) return <ChevronsUpDown size={13} className="text-muted-foreground" />;
    return controller.request.SortOrder === 'desc'
      ? <ArrowDown size={13} className="text-foreground" />
      : <ArrowUp size={13} className="text-foreground" />;
  };

  if (form) return <>{form}</>;

  return (
    <View
      className="overflow-hidden rounded-lg border border-border bg-card"
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      <View className={cn('relative z-20 gap-3 border-b border-border/60 bg-muted/60 px-3', compact ? 'py-3' : 'h-11 flex-row items-center py-1')}>
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-bold text-[11px] uppercase tracking-[2px]">{title}</Text>
          {!compact ? <Text className="text-[10px] text-muted-foreground">{totalRecords} registros locales</Text> : null}
        </View>
        <View className="flex-row items-center gap-2">
          {compact && !readOnly && (onAdd || onEdit || onDelete) ? (
            <View className="relative">
              <Pressable accessibilityRole="button" accessibilityLabel="Acciones" onPress={() => setActionsOpen((open) => !open)} className="h-8 flex-row items-center gap-2 rounded-lg border border-border/20 bg-background/40 px-3">
                <Text className="font-poppins-bold text-[9px] uppercase tracking-[1.5px] text-muted-foreground">Acciones</Text>
                <ChevronDown size={14} className="text-muted-foreground" />
              </Pressable>
              {actionsOpen ? (
                <View className="absolute left-0 top-10 z-50 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
                  {onAdd ? <Pressable className="h-9 flex-row items-center gap-2 px-3" onPress={() => { setActionsOpen(false); onAdd(); }}><Plus size={15} className="text-success" /><Text className="font-poppins-bold text-[10px] uppercase tracking-[1.5px] text-success">Agregar</Text></Pressable> : null}
                  {onEdit ? <Pressable disabled={!selected} className={cn('h-9 flex-row items-center gap-2 px-3', !selected && 'opacity-40')} onPress={() => { if (!selected) return; setActionsOpen(false); onEdit(selected); }}><Pencil size={15} className="text-blue-500" /><Text className="font-poppins-bold text-[10px] uppercase tracking-[1.5px] text-blue-500">Editar</Text></Pressable> : null}
                  {onDelete ? <Pressable disabled={!selected} className={cn('h-9 flex-row items-center gap-2 px-3', !selected && 'opacity-40')} onPress={() => { if (!selected) return; setActionsOpen(false); onDelete(selected); }}><Trash2 size={15} className="text-destructive" /><Text className="font-poppins-bold text-[10px] uppercase tracking-[1.5px] text-destructive">Eliminar</Text></Pressable> : null}
                </View>
              ) : null}
            </View>
          ) : null}
          <View className="relative min-w-0 flex-1 justify-center md:w-72 md:flex-none">
            <Search className="absolute left-3 z-10 text-muted-foreground" size={16} />
            <Input value={query} onChangeText={controller.setLiveSearchText} placeholder={searchPlaceholder} className="h-8 pl-9 text-xs" />
          </View>
          {!compact && !readOnly && onAdd ? <Button variant="ghost" size="icon" className="h-8 w-8" onPress={onAdd} accessibilityLabel="Agregar"><Plus size={16} className="text-success" /></Button> : null}
          {!compact && !readOnly && onEdit ? <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!selected} onPress={() => selected && onEdit(selected)} accessibilityLabel="Editar"><Pencil size={15} className="text-blue-500" /></Button> : null}
          {!compact && !readOnly && onDelete ? <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!selected} onPress={() => selected && onDelete(selected)} accessibilityLabel="Eliminar"><Trash2 size={15} className="text-destructive" /></Button> : null}
        </View>
      </View>

      {extraFilters ? <View className="border-b border-border bg-background p-3">{extraFilters}</View> : null}
      {controller.error ? <View className="border-b border-destructive/30 bg-destructive/5 px-3 py-2"><Text className="text-sm text-destructive">{controller.error instanceof Error ? controller.error.message : 'No se pudieron consultar los registros locales.'}</Text></View> : null}

      {compact && !loading ? (
        <View className="relative z-10 flex-row items-center gap-2 border-b border-border/60 bg-card px-4 py-3">
          <Text className="font-poppins-bold text-[11px] uppercase tracking-[1px] text-muted-foreground">Ordenar por</Text>
          <View className="relative min-w-0 flex-1">
            <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar columna de orden" onPress={() => setSortOpen((open) => !open)} className="h-8 flex-row items-center justify-between rounded-md border border-border/30 bg-muted/40 px-2">
              <Text className="text-xs text-foreground">{columns.find((column) => column.key === controller.request.OrderBy)?.title ?? '—'}</Text>
              <ChevronDown size={14} className="text-foreground" />
            </Pressable>
            {sortOpen ? <View className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">{columns.filter((column) => column.sortable !== false).map((column) => <Pressable key={column.key} className="h-8 justify-center px-3" onPress={() => { setSortOpen(false); controller.sort(column.key); }}><Text className="text-xs">{column.title}</Text></Pressable>)}</View> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cambiar dirección de orden" disabled={!controller.request.OrderBy} onPress={() => controller.request.OrderBy && controller.sort(controller.request.OrderBy)} className="h-7 w-7 items-center justify-center">
            {controller.request.OrderBy ? <SortIcon column={controller.request.OrderBy} /> : <ChevronsUpDown size={16} className="text-muted-foreground" />}
          </Pressable>
        </View>
      ) : null}

      {loading ? <View className="h-48 items-center justify-center gap-3"><ActivityIndicator /><Text variant="muted">Leyendo datos locales...</Text></View> : null}
      {!loading && compact ? (
        <View>{visible.map((row) => (
          <Pressable key={row.id} onPress={() => select(row)} className={cn('gap-3 border-b border-border/60 p-4 last:border-b-0', selectedId === row.id && 'bg-primary-selection')}>
            <View className="flex-row items-start justify-between gap-4"><Text className="font-poppins-bold text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Sincronización</Text><View className="flex-row items-center gap-1.5"><View className={cn('h-1.5 w-1.5 rounded-full', colors[row.syncStatus])} /><Text className="text-xs text-foreground/90">{labels[row.syncStatus]}</Text></View></View>
            {columns.map((column) => <View key={column.key} className="flex-row items-start justify-between gap-4"><Text className="font-poppins-bold mt-0.5 text-[10px] uppercase tracking-[1.5px] text-muted-foreground">{column.title}</Text><View className="min-w-0 flex-1 items-end"><CellContent row={row} column={column} /></View></View>)}
          </Pressable>
        ))}</View>
      ) : null}
      {!loading && !compact ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ width: Math.max(760, containerWidth) }}>
            <View className="h-8 flex-row items-center border-b border-border bg-muted/30 px-3"><Text className="w-28 text-[10px] font-semibold text-muted-foreground">Sincronización</Text>{columns.map((column) => <Pressable key={column.key} disabled={column.sortable === false} onPress={() => controller.sort(column.key)} style={{ width: column.width ?? 160, flexGrow: column.flex ?? 0, flexBasis: column.width ?? 160 }} className={cn('flex-row items-center gap-1 px-2', column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : undefined)}><Text className="text-[10px] font-semibold text-muted-foreground">{column.title}</Text>{column.sortable !== false ? <SortIcon column={column.key} /> : null}</Pressable>)}</View>
            {visible.map((row) => <Pressable key={row.id} onPress={() => select(row)} className={cn('h-9 flex-row items-center border-b border-border/70 px-3 last:border-b-0', selectedId === row.id && 'bg-primary-selection')}>
              <View className="w-28 flex-row items-center gap-1.5"><View className={cn('h-1.5 w-1.5 rounded-full', colors[row.syncStatus])} /><Text className="text-[10px] text-muted-foreground">{labels[row.syncStatus]}</Text></View>
              {columns.map((column) => <View key={column.key} style={{ width: column.width ?? 160, flexGrow: column.flex ?? 0, flexBasis: column.width ?? 160 }} className={cn('px-2', column.align === 'right' ? 'items-end' : column.align === 'center' ? 'items-center' : undefined)}><CellContent row={row} column={column} /></View>)}
            </Pressable>)}
          </View>
        </ScrollView>
      ) : null}
      {!loading && !visible.length ? <View className="h-36 items-center justify-center"><Text variant="muted">No se encontraron registros</Text></View> : null}

      <View className="h-10 flex-row items-center justify-between gap-2 border-t border-border bg-muted/50 px-3">
        <View className="flex-row items-center gap-2">
          {!compact ? <Text className="text-[10px] text-muted-foreground">Filas por página</Text> : null}
          <View className="relative z-50">
            <Pressable accessibilityRole="button" accessibilityLabel="Filas por página" onPress={() => setPageSizeOpen((open) => !open)} className="h-7 min-w-16 flex-row items-center justify-between gap-2 rounded-md bg-background px-2">
              <Text className="text-[10px] font-semibold">{pageSize}</Text>
              <ChevronDown size={13} className="text-muted-foreground" />
            </Pressable>
            {pageSizeOpen ? (
              <View className="absolute bottom-8 left-0 min-w-16 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
                {pageSizes.map((size) => (
                  <Pressable key={size} onPress={() => { controller.setPageSize(size); setPageSizeOpen(false); }} className={cn('h-7 justify-center px-2', pageSize === size && 'bg-primary-selection')}>
                    <Text className="text-[10px] font-semibold">{size}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <View className="flex-row items-center gap-0.5"><Text className="mr-1 text-[10px] text-muted-foreground">{from}-{to}/{totalRecords}</Text><Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onPress={() => controller.setPage(1)} accessibilityLabel="Primera página"><ChevronsLeft size={15} /></Button><Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onPress={() => controller.setPage(Math.max(1, currentPage - 1))} accessibilityLabel="Anterior"><ChevronLeft size={15} /></Button><Text className="w-5 text-center text-[11px] font-semibold">{currentPage}</Text><Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onPress={() => controller.setPage(Math.min(totalPages, currentPage + 1))} accessibilityLabel="Siguiente"><ChevronRight size={15} /></Button><Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onPress={() => controller.setPage(totalPages)} accessibilityLabel="Última página"><ChevronsRight size={15} /></Button></View>
      </View>
    </View>
  );
}
