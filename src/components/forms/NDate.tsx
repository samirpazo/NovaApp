import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';
import { Calendar, X } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { NField } from '@/components/forms/NField';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NDateProps {
  label?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mode?: 'date' | 'datetime' | 'time';
  clearable?: boolean;
  minDate?: string | null;
  maxDate?: string | null;
  required?: boolean;
  errorMessage?: string;
  hint?: string;
  containerClassName?: string;
}

const parseValue = (
  value: string | null | undefined,
  mode: NDateProps['mode'],
) => {
  if (!value) return DateTime.now();
  const parsed =
    mode === 'time'
      ? DateTime.fromFormat(value, 'HH:mm:ss')
      : DateTime.fromISO(value, { setZone: true });
  return parsed.isValid ? parsed : DateTime.now();
};

export function NDate({
  label,
  value,
  defaultValue = null,
  onChange,
  placeholder = 'Seleccionar fecha...',
  disabled = false,
  mode = 'date',
  clearable = false,
  minDate,
  maxDate,
  required,
  errorMessage,
  hint,
  containerClassName,
}: NDateProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue,
  );
  const [pickerMode, setPickerMode] = React.useState<'date' | 'time' | null>(
    null,
  );
  const activeValue = controlled ? value : internalValue;
  const selectedDate = parseValue(activeValue, mode);

  const emit = (date: DateTime) => {
    const next =
      mode === 'time' ? date.toFormat('HH:mm:ss') : (date.toISO() ?? '');
    if (!controlled) setInternalValue(next);
    onChange?.(next);
  };
  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (!date) return;
    const next = DateTime.fromJSDate(date);
    emit(next);
    if (mode === 'datetime' && pickerMode === 'date') setPickerMode('time');
  };
  const display = activeValue
    ? mode === 'time'
      ? selectedDate.toFormat('HH:mm')
      : mode === 'datetime'
        ? selectedDate.toFormat('dd/LL/yyyy HH:mm')
        : selectedDate.toFormat('dd/LL/yyyy')
    : placeholder;

  return (
    <NField
      label={label}
      required={required}
      errorMessage={errorMessage}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setPickerMode(mode === 'time' ? 'time' : 'date')}
        className={cn(
          'h-10 flex-row items-center rounded-md border border-input bg-background px-3',
          errorMessage && 'border-destructive',
          disabled && 'opacity-50',
        )}
      >
        <Calendar
          size={18}
          className="mr-2 text-muted-foreground"
        />
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 text-sm',
            !activeValue && 'text-muted-foreground',
          )}
        >
          {display}
        </Text>
        {clearable && activeValue ? (
          <Pressable
            accessibilityLabel={`Limpiar ${label ?? 'fecha'}`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              if (!controlled) setInternalValue(null);
              onChange?.('');
            }}
          >
            <X
              size={17}
              className="text-muted-foreground"
            />
          </Pressable>
        ) : null}
      </Pressable>
      {pickerMode ? (
        <View
          className={
            Platform.OS === 'ios'
              ? 'rounded-md border border-border bg-background p-2'
              : undefined
          }
        >
          <DateTimePicker
            value={selectedDate.toJSDate()}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            minimumDate={
              minDate ? parseValue(minDate, mode).toJSDate() : undefined
            }
            maximumDate={
              maxDate ? parseValue(maxDate, mode).toJSDate() : undefined
            }
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setPickerMode(null)}
              className="self-end px-3 py-2"
            >
              <Text className="text-sm font-semibold text-primary">Listo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </NField>
  );
}
