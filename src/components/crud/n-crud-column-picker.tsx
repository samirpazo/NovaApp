import { Check, Columns3 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import type { NCrudColumn, NCrudRow } from '@/components/crud/contracts';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NCrudColumnPickerProps<T extends NCrudRow> {
  columns: NCrudColumn<T>[];
  visibleKeys: string[];
  onToggle: (key: keyof T & string, visible: boolean) => void;
}

export function NCrudColumnPicker<T extends NCrudRow>({
  columns,
  visibleKeys,
  onToggle,
}: NCrudColumnPickerProps<T>) {
  const [open, setOpen] = React.useState(false);
  const hideableColumns = columns.filter((column) => column.hideable !== false);
  if (hideableColumns.length < 2) return null;

  return (
    <View className="relative z-50">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Configurar columnas"
        onPress={() => setOpen((value) => !value)}
        className="h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
      >
        <Columns3
          size={15}
          className="text-muted-foreground"
        />
      </Pressable>
      {open ? (
        <View className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
          <Text className="px-3 py-2 text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
            Columnas visibles
          </Text>
          {hideableColumns.map((column) => {
            const visible = visibleKeys.includes(column.key);
            const lastVisible = visible && visibleKeys.length === 1;
            return (
              <Pressable
                key={column.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: visible, disabled: lastVisible }}
                disabled={lastVisible}
                onPress={() => onToggle(column.key, !visible)}
                className={cn(
                  'h-9 flex-row items-center gap-2 px-3',
                  lastVisible && 'opacity-40',
                )}
              >
                <View
                  className={cn(
                    'h-4 w-4 items-center justify-center rounded border',
                    visible ? 'border-primary bg-primary' : 'border-border',
                  )}
                >
                  {visible ? (
                    <Check
                      size={12}
                      className="text-primary-foreground"
                    />
                  ) : null}
                </View>
                <Text className="min-w-0 flex-1 text-xs">{column.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
