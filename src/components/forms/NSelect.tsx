import { NField } from '@/components/forms/NField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, View } from 'react-native';

type SelectValue = string | number | boolean;
type SelectItem = SelectValue | Record<string, unknown>;

export interface NSelectProps<TItem extends SelectItem = SelectItem> {
  label?: string;
  items: readonly TItem[];
  itemText?: keyof TItem | string;
  itemValue?: keyof TItem | string;
  value?: unknown;
  defaultValue?: unknown;
  onChange?: (value: unknown) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  returnObject?: boolean;
  required?: boolean;
  errorMessage?: string;
  hint?: string;
  containerClassName?: string;
}

const getProperty = (item: SelectItem, key: string): unknown =>
  typeof item === 'object' && item !== null ? item[key] : item;

export function NSelect<TItem extends SelectItem = SelectItem>({
  label,
  items,
  itemText = 'text',
  itemValue = 'value',
  value,
  defaultValue,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  noResultsText = 'No hay resultados',
  disabled = false,
  loading = false,
  clearable = false,
  searchable = false,
  multiple = false,
  returnObject = false,
  required,
  errorMessage,
  hint,
  containerClassName,
}: NSelectProps<TItem>) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<unknown>(defaultValue ?? (multiple ? [] : null));
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const activeValue = controlled ? value : internalValue;

  const valueOf = React.useCallback((item: TItem) => getProperty(item, String(itemValue)), [itemValue]);
  const textOf = React.useCallback((item: TItem) => String(getProperty(item, String(itemText)) ?? ''), [itemText]);
  const selectedValues = React.useMemo(() => {
    const selected = multiple ? (Array.isArray(activeValue) ? activeValue : []) : activeValue == null ? [] : [activeValue];
    return selected.map((entry) => (returnObject && typeof entry === 'object' && entry !== null ? getProperty(entry as TItem, String(itemValue)) : entry));
  }, [activeValue, itemValue, multiple, returnObject]);
  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedValues.some((selected) => String(selected) === String(valueOf(item)))),
    [items, selectedValues, valueOf],
  );
  const filteredItems = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term ? items.filter((item) => textOf(item).toLocaleLowerCase().includes(term)) : items;
  }, [items, search, textOf]);

  const emit = (next: unknown) => {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
  };
  const select = (item: TItem) => {
    const result = returnObject ? item : valueOf(item);
    if (!multiple) {
      emit(result);
      setOpen(false);
      return;
    }
    const current = Array.isArray(activeValue) ? activeValue : [];
    const exists = selectedValues.some((selected) => String(selected) === String(valueOf(item)));
    emit(exists ? current.filter((entry) => String(returnObject && typeof entry === 'object' && entry !== null ? getProperty(entry as TItem, String(itemValue)) : entry) !== String(valueOf(item))) : [...current, result]);
  };
  const displayText = selectedItems.length ? selectedItems.map(textOf).join(', ') : placeholder;

  return (
    <NField label={label} required={required} errorMessage={errorMessage} hint={hint} disabled={disabled} className={containerClassName}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        className={cn('h-10 flex-row items-center rounded-md border border-input bg-background px-3', errorMessage && 'border-destructive', (disabled || loading) && 'opacity-50')}>
        <Text numberOfLines={1} className={cn('flex-1 text-sm', !selectedItems.length && 'text-muted-foreground')}>
          {loading ? 'Cargando...' : displayText}
        </Text>
        {clearable && selectedItems.length ? (
          <Pressable
            accessibilityLabel={`Limpiar ${label ?? 'seleccion'}`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              emit(multiple ? [] : null);
            }}>
            <X size={17} className="text-muted-foreground" />
          </Pressable>
        ) : (
          <ChevronDown size={18} className="text-muted-foreground" />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <Text className="flex-1 text-base font-semibold">{label ?? 'Seleccionar'}</Text>
            <Button variant="ghost" size="icon" onPress={() => setOpen(false)} accessibilityLabel="Cerrar">
              <X size={20} />
            </Button>
          </View>
          {searchable ? (
            <View className="relative mx-4 my-3 justify-center">
              <Search size={18} className="absolute left-3 z-10 text-muted-foreground" />
              <Input value={search} onChangeText={setSearch} placeholder={searchPlaceholder} className="pl-10" autoFocus />
            </View>
          ) : null}
          <FlatList
            data={[...filteredItems]}
            keyExtractor={(item, index) => `${String(valueOf(item))}-${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-4 py-2"
            ListEmptyComponent={<Text className="py-10 text-center text-muted-foreground">{noResultsText}</Text>}
            renderItem={({ item }) => {
              const selected = selectedValues.some((entry) => String(entry) === String(valueOf(item)));
              return (
                <Pressable onPress={() => select(item)} className="min-h-12 flex-row items-center border-b border-border py-3">
                  <Text className="flex-1 text-sm">{textOf(item)}</Text>
                  {selected ? <Check size={19} className="text-primary" /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </NField>
  );
}
