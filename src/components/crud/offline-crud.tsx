import type { SyncStatus } from '@nozbe/watermelondb/Model';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NCrudRow {
  id: string;
  syncStatus: SyncStatus;
}

export interface NCrudColumn<T extends NCrudRow> {
  key: keyof T & string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (row: T) => React.ReactNode;
}

interface NCrudProps<T extends NCrudRow> {
  title: string;
  rows: T[];
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

export function NCrud<T extends NCrudRow>({
  title, rows, columns, loading = false, readOnly = false, pageSizes = [10, 25, 50],
  searchPlaceholder = 'Buscar...', searchText, onAdd, onEdit, onDelete,
}: NCrudProps<T>) {
  const compact = useWindowDimensions().width < 720;
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pageSizes[0] ?? 10);
  const filtered = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? rows.filter((row) => (searchText?.(row) ?? JSON.stringify(row)).toLocaleLowerCase().includes(needle)) : rows;
  }, [query, rows, searchText]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  React.useEffect(() => setPage(1), [query, pageSize]);
  React.useEffect(() => {
    if (selectedId && !rows.some((row) => row.id === selectedId)) setSelectedId(null);
  }, [rows, selectedId]);

  const select = (row: T) => setSelectedId((value) => value === row.id ? null : row.id);
  const from = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, filtered.length);

  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <View className={cn('gap-3 border-b border-border bg-muted p-3', !compact && 'flex-row items-center')}>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold">{title}</Text>
          <Text variant="caption">{filtered.length} registros locales</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="relative min-w-0 flex-1 justify-center md:w-72 md:flex-none">
            <Search className="absolute left-3 z-10 text-muted-foreground" size={16} />
            <Input value={query} onChangeText={setQuery} placeholder={searchPlaceholder} className="pl-9" />
          </View>
          {!readOnly && onAdd ? <Button size="icon" onPress={onAdd} accessibilityLabel="Agregar"><Plus size={18} className="text-primary-foreground" /></Button> : null}
          {!readOnly && onEdit ? <Button variant="outline" size="icon" disabled={!selected} onPress={() => selected && onEdit(selected)} accessibilityLabel="Editar"><Pencil size={17} /></Button> : null}
          {!readOnly && onDelete ? <Button variant="outline" size="icon" disabled={!selected} onPress={() => selected && onDelete(selected)} accessibilityLabel="Eliminar"><Trash2 size={17} className="text-destructive" /></Button> : null}
        </View>
      </View>

      {loading ? <View className="h-48 items-center justify-center gap-3"><ActivityIndicator /><Text variant="muted">Leyendo datos locales...</Text></View> : null}
      {!loading && compact ? (
        <View>{visible.map((row) => (
          <Pressable key={row.id} onPress={() => select(row)} className={cn('gap-3 border-b border-border p-4 last:border-b-0', selectedId === row.id && 'bg-secondary')}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2"><View className={cn('h-2 w-2 rounded-full', colors[row.syncStatus])} /><Text variant="caption">{labels[row.syncStatus]}</Text></View>
              {selectedId === row.id && !readOnly && onEdit ? <Button variant="ghost" size="icon" onPress={() => onEdit(row)} accessibilityLabel="Editar seleccionado"><Pencil size={16} /></Button> : null}
            </View>
            {columns.map((column) => <View key={column.key} className="flex-row items-start justify-between gap-4"><Text variant="caption">{column.title}</Text><Text variant="small" className="min-w-0 flex-1 text-right">{cell(row, column)}</Text></View>)}
          </Pressable>
        ))}</View>
      ) : null}
      {!loading && !compact ? (
        <ScrollView horizontal>
          <View className="min-w-full">
            <View className="flex-row border-b border-border bg-background px-3 py-2.5"><Text variant="caption" className="w-36">Estado</Text>{columns.map((column) => <Text key={column.key} variant="caption" style={{ width: column.width ?? 180 }} className={cn('px-2', column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : undefined)}>{column.title}</Text>)}</View>
            {visible.map((row) => <Pressable key={row.id} onPress={() => select(row)} className={cn('flex-row items-center border-b border-border px-3 py-3 last:border-b-0', selectedId === row.id && 'bg-secondary')}>
              <View className="w-36 flex-row items-center gap-2"><View className={cn('h-2 w-2 rounded-full', colors[row.syncStatus])} /><Text variant="caption">{labels[row.syncStatus]}</Text></View>
              {columns.map((column) => <Text key={column.key} variant="small" numberOfLines={1} style={{ width: column.width ?? 180 }} className={cn('px-2', column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : undefined)}>{cell(row, column)}</Text>)}
            </Pressable>)}
          </View>
        </ScrollView>
      ) : null}
      {!loading && !visible.length ? <View className="h-36 items-center justify-center"><Text variant="muted">No se encontraron registros</Text></View> : null}

      <View className="flex-row items-center justify-between gap-2 border-t border-border bg-muted px-3 py-2">
        <View className="flex-row items-center gap-1">{pageSizes.map((size) => <Pressable key={size} onPress={() => setPageSize(size)} className={cn('h-8 min-w-8 items-center justify-center rounded-md px-2', pageSize === size ? 'bg-primary' : 'bg-background')}><Text variant="caption" className={pageSize === size ? 'text-primary-foreground' : undefined}>{size}</Text></Pressable>)}</View>
        <View className="flex-row items-center gap-1"><Text variant="caption">{from}-{to} de {filtered.length}</Text><Button variant="ghost" size="icon" disabled={currentPage === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} accessibilityLabel="Anterior"><ChevronLeft size={17} /></Button><Text variant="small" className="w-6 text-center">{currentPage}</Text><Button variant="ghost" size="icon" disabled={currentPage === totalPages} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} accessibilityLabel="Siguiente"><ChevronRight size={17} /></Button></View>
      </View>
    </View>
  );
}
