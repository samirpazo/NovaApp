import * as React from 'react';
import { View } from 'react-native';

import type { NCrudColumn, NCrudRow } from '@/components/crud/contracts';
import { NText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export interface NCrudFilterPanelProps<T extends NCrudRow> {
  columns: NCrudColumn<T>[];
  values: Record<string, string>;
  customFilters?: React.ReactNode;
  onChange: (column: string, value: string) => void;
  onReset: () => void;
}

export function NCrudFilterPanel<T extends NCrudRow>({
  columns,
  values,
  customFilters,
  onChange,
  onReset,
}: NCrudFilterPanelProps<T>) {
  const searchable = columns.filter((column) => column.searchable);
  return (
    <View className="gap-3 border-b border-border/60 bg-muted/20 p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
          Filtros
        </Text>
        <Button
          variant="ghost"
          className="h-7 px-2"
          onPress={onReset}
        >
          <Text className="text-[10px]">Restablecer filtros</Text>
        </Button>
      </View>
      {searchable.length ? (
        <View className="gap-3 md:flex-row md:flex-wrap">
          {searchable.map((column) => (
            <NText
              key={column.key}
              label={column.title}
              value={values[column.key] ?? ''}
              onChange={(value) => onChange(column.key, value)}
              containerClassName="min-w-48 flex-1"
            />
          ))}
        </View>
      ) : null}
      {customFilters}
    </View>
  );
}
