import { ArrowDown, ArrowUp, ChevronsUpDown, Check } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type {
  NCrudAction,
  NCrudColumn,
  NCrudRow,
} from '@/components/crud/contracts';
import { isNCrudActionDisabled } from '@/components/crud/n-crud-actions';
import {
  resolveNCrudOfflineStatus,
  type NCrudOfflineStatus,
} from '@/components/crud/n-crud-offline-state';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NCrudTableProps<T extends NCrudRow> {
  rows: T[];
  columns: NCrudColumn<T>[];
  compact: boolean;
  containerWidth: number;
  selectedIds: string[];
  selectionMode: 'none' | 'single' | 'multiple';
  onSelect: (row: T) => void;
  onSelectAll: () => void;
  orderBy: string | null;
  sortOrder: 'asc' | 'desc' | null;
  onSort: (column: string) => void;
  rowActions?: (row: T) => NCrudAction<T>[];
  conflictIds?: string[];
  syncing?: boolean;
}

function Cell<T extends NCrudRow>({
  row,
  column,
}: {
  row: T;
  column: NCrudColumn<T>;
}) {
  const value = column.format ? column.format(row) : row[column.key];
  const alignment =
    column.align === 'right'
      ? 'text-right'
      : column.align === 'center'
        ? 'text-center'
        : 'text-left';
  if (React.isValidElement(value)) return value;
  return (
    <Text
      numberOfLines={1}
      className={cn('w-full text-xs', alignment)}
    >
      {value == null
        ? '-'
        : typeof value === 'string' || typeof value === 'number'
          ? value
          : null}
    </Text>
  );
}

const syncLabels: Record<NCrudOfflineStatus, string> = {
  synced: 'Sincronizado',
  created: 'Nuevo local',
  updated: 'Editado local',
  deleted: 'Eliminado',
  disposable: 'Temporal',
  conflict: 'Conflicto',
  syncing: 'Sincronizando',
};

const syncColors: Record<NCrudOfflineStatus, string> = {
  synced: 'bg-success',
  created: 'bg-primary',
  updated: 'bg-warning',
  deleted: 'bg-destructive',
  disposable: 'bg-muted-foreground',
  conflict: 'bg-destructive',
  syncing: 'bg-primary',
};

function SyncStatus({ status }: { status: NCrudOfflineStatus }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={cn('h-1.5 w-1.5 rounded-full', syncColors[status])} />
      <Text className="text-[10px] text-muted-foreground">
        {syncLabels[status]}
      </Text>
    </View>
  );
}

export function NCrudTable<T extends NCrudRow>({
  rows,
  columns,
  compact,
  containerWidth,
  selectedIds,
  selectionMode,
  onSelect,
  onSelectAll,
  orderBy,
  sortOrder,
  onSort,
  rowActions,
  conflictIds = [],
  syncing = false,
}: NCrudTableProps<T>) {
  const selected = (row: T) => selectedIds.includes(row.id);
  const allSelected =
    selectionMode === 'multiple' && rows.length > 0 && rows.every(selected);
  const offlineStatus = (row: T) =>
    resolveNCrudOfflineStatus({
      syncStatus: row.syncStatus,
      hasConflict: conflictIds.includes(row.id),
      isSyncing: syncing,
    });
  const renderRowActions = (row: T) =>
    (rowActions?.(row) ?? [])
      .filter((action) => {
        if (action.permission === false) return false;
        return typeof action.visible === 'function'
          ? action.visible([row])
          : action.visible !== false;
      })
      .map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          disabled={isNCrudActionDisabled(action, [row])}
          onPress={(event) => {
            event.stopPropagation();
            void action.onPress([row]);
          }}
          className={cn(
            'rounded px-2 py-1',
            isNCrudActionDisabled(action, [row]) && 'opacity-40',
          )}
        >
          <Text className="text-xs text-primary">{action.label}</Text>
        </Pressable>
      ));
  const SortIcon = ({ column }: { column: string }) =>
    orderBy !== column ? (
      <ChevronsUpDown
        size={13}
        className="text-muted-foreground"
      />
    ) : sortOrder === 'desc' ? (
      <ArrowDown size={13} />
    ) : (
      <ArrowUp size={13} />
    );

  if (compact)
    return (
      <View>
        {selectionMode === 'multiple' ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            onPress={onSelectAll}
            className="h-9 flex-row items-center gap-2 border-b border-border/60 px-4"
          >
            <View
              className={cn(
                'h-4 w-4 items-center justify-center rounded border',
                allSelected ? 'border-primary bg-primary' : 'border-border',
              )}
            >
              {allSelected ? (
                <Check
                  size={12}
                  className="text-primary-foreground"
                />
              ) : null}
            </View>
            <Text className="text-xs text-muted-foreground">
              Seleccionar todos los visibles
            </Text>
          </Pressable>
        ) : null}
        {rows.length === 0 ? (
          <View className="h-32 items-center justify-center px-4">
            <Text className="text-xs text-muted-foreground">
              No hay registros para mostrar.
            </Text>
          </View>
        ) : null}
        {rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => onSelect(row)}
            className={cn(
              'gap-3 border-b border-border/60 p-4 last:border-b-0',
              selected(row) && 'bg-primary-selection',
            )}
          >
            <View className="flex-row items-center justify-between">
              <SyncStatus status={offlineStatus(row)} />
              {selectionMode !== 'none' ? (
                <View
                  className={cn(
                    'h-4 w-4 items-center justify-center rounded border',
                    selected(row)
                      ? 'border-primary bg-primary'
                      : 'border-border',
                  )}
                >
                  {selected(row) ? (
                    <Check
                      size={12}
                      className="text-primary-foreground"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
            {columns.map((column) => (
              <View
                key={column.key}
                className="flex-row items-start justify-between gap-4"
              >
                <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                  {column.title}
                </Text>
                <View
                  className={cn(
                    'min-w-0 flex-1',
                    column.align === 'left' ? 'items-start' : 'items-end',
                  )}
                >
                  <Cell
                    row={row}
                    column={column}
                  />
                </View>
              </View>
            ))}
            {rowActions ? (
              <View className="flex-row justify-end pt-1">
                {renderRowActions(row)}
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View style={{ width: Math.max(760, containerWidth) }}>
        <View className="h-8 flex-row items-center border-b border-border bg-muted/30 px-3">
          {selectionMode === 'multiple' ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              onPress={onSelectAll}
              className="w-8 items-center"
            >
              <View
                className={cn(
                  'h-4 w-4 items-center justify-center rounded border',
                  allSelected ? 'border-primary bg-primary' : 'border-border',
                )}
              >
                {allSelected ? (
                  <Check
                    size={12}
                    className="text-primary-foreground"
                  />
                ) : null}
              </View>
            </Pressable>
          ) : null}
          <Text className="w-28 text-[10px] font-semibold text-muted-foreground">
            Sincronización
          </Text>
          {columns.map((column) => (
            <Pressable
              key={column.key}
              disabled={column.sortable === false}
              onPress={() => onSort(column.key)}
              style={{
                width: column.width ?? 160,
                flexGrow: column.flex ?? 0,
                flexBasis: column.width ?? 160,
              }}
              className={cn(
                'flex-row items-center gap-1 px-2',
                column.align === 'right' && 'justify-end',
                column.align === 'center' && 'justify-center',
              )}
            >
              <Text className="text-[10px] font-semibold text-muted-foreground">
                {column.title}
              </Text>
              {column.sortable !== false ? (
                <SortIcon column={column.key} />
              ) : null}
            </Pressable>
          ))}
          {rowActions ? (
            <Text className="w-24 text-center text-[10px] font-semibold text-muted-foreground">
              Acción
            </Text>
          ) : null}
        </View>
        {rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => onSelect(row)}
            className={cn(
              'h-9 flex-row items-center border-b border-border/70 px-3',
              selected(row) && 'bg-primary-selection',
            )}
          >
            {selectionMode === 'multiple' ? (
              <View className="w-8 items-center">
                <View
                  className={cn(
                    'h-4 w-4 items-center justify-center rounded border',
                    selected(row)
                      ? 'border-primary bg-primary'
                      : 'border-border',
                  )}
                >
                  {selected(row) ? (
                    <Check
                      size={12}
                      className="text-primary-foreground"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
            <View className="w-28">
              <SyncStatus status={offlineStatus(row)} />
            </View>
            {columns.map((column) => (
              <View
                key={column.key}
                style={{
                  width: column.width ?? 160,
                  flexGrow: column.flex ?? 0,
                  flexBasis: column.width ?? 160,
                }}
                className={cn(
                  'justify-center px-2',
                  column.align === 'right' && 'items-end',
                  column.align === 'center' && 'items-center',
                )}
              >
                <Cell
                  row={row}
                  column={column}
                />
              </View>
            ))}
            {rowActions ? (
              <View className="w-24 items-center justify-center">
                {renderRowActions(row)}
              </View>
            ) : null}
          </Pressable>
        ))}
        {rows.length === 0 ? (
          <View className="h-32 items-center justify-center">
            <Text className="text-xs text-muted-foreground">
              No hay registros para mostrar.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
