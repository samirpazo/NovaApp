import { DateTime } from 'luxon';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';

import { NField } from '@/components/forms/NField';
import { Calendar } from '@/components/ui/calendar';
import { Text } from '@/components/ui/text';
import type { NDateProps } from '@/components/forms/NDate';

const toInputValue = (
  value: string | null | undefined,
  mode: NDateProps['mode'],
) => {
  if (!value) return '';
  if (mode === 'time') return value.slice(0, 5);
  const date = DateTime.fromISO(value);
  if (!date.isValid) return '';
  return mode === 'datetime'
    ? date.toFormat("yyyy-LL-dd'T'HH:mm")
    : date.toFormat('yyyy-LL-dd');
};

export function NDate({
  label,
  value,
  defaultValue = null,
  onChange,
  placeholder,
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
  const { colorScheme } = useColorScheme();
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue,
  );
  const [open, setOpen] = React.useState(false);
  const [calendarPosition, setCalendarPosition] = React.useState({
    left: 8,
    top: 8,
  });
  const triggerRef = React.useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const activeValue = controlled ? value : internalValue;
  const inputType = mode === 'datetime' ? 'datetime-local' : mode;

  const emit = (inputValue: string) => {
    let next = inputValue;
    if (inputValue && mode === 'time') next = `${inputValue}:00`;
    if (inputValue && mode !== 'time')
      next = DateTime.fromISO(inputValue).toISO() ?? '';
    if (!controlled) setInternalValue(next || null);
    onChange?.(next);
  };

  const openCalendar = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const calendarWidth = 280;
      const calendarHeight = 316;
      setCalendarPosition({
        left: Math.max(8, Math.min(x, windowWidth - calendarWidth - 8)),
        top:
          y + height + calendarHeight > windowHeight
            ? Math.max(8, y - calendarHeight)
            : y + height + 4,
      });
      setOpen(true);
    });
  };

  const selectedDate = activeValue ? DateTime.fromISO(activeValue) : null;
  const displayValue = selectedDate?.isValid
    ? selectedDate.toFormat('dd/LL/yyyy')
    : '';

  return (
    <NField
      label={label}
      required={required}
      errorMessage={errorMessage}
      hint={hint}
      disabled={disabled}
      className={containerClassName}
    >
      <View className="relative justify-center">
        {mode === 'date' ? (
          <Pressable
            ref={triggerRef}
            accessibilityLabel={label ?? 'Seleccionar fecha'}
            accessibilityRole="button"
            accessibilityState={{ disabled, expanded: open }}
            disabled={disabled}
            onPress={openCalendar}
            className={`h-9 flex-row items-center rounded-md border bg-background px-2.5 ${errorMessage ? 'border-destructive' : 'border-input'}`}
          >
            <CalendarIcon
              size={16}
              className="mr-2 text-muted-foreground"
            />
            <Text
              numberOfLines={1}
              className={`flex-1 text-xs ${displayValue ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {displayValue || placeholder || 'Seleccionar fecha...'}
            </Text>
            {clearable && activeValue && !disabled ? (
              <Pressable
                accessibilityLabel={`Limpiar ${label ?? 'fecha'}`}
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  emit('');
                }}
              >
                <X
                  size={15}
                  className="text-muted-foreground"
                />
              </Pressable>
            ) : (
              <ChevronDown
                size={15}
                className="text-muted-foreground"
              />
            )}
          </Pressable>
        ) : (
          React.createElement('input', {
            'aria-invalid': Boolean(errorMessage),
            'aria-label': label,
            disabled,
            max: toInputValue(maxDate, mode),
            min: toInputValue(minDate, mode),
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
              emit(event.target.value),
            placeholder,
            required,
            style: {
              background: 'hsl(var(--background))',
              border: `1px solid ${errorMessage ? 'hsl(var(--destructive))' : 'hsl(var(--input))'}`,
              borderRadius: 6,
              boxSizing: 'border-box',
              color: 'hsl(var(--foreground))',
              colorScheme,
              fontFamily: 'Poppins, sans-serif',
              fontSize: 12,
              height: 40,
              padding: clearable && activeValue ? '0 40px 0 12px' : '0 12px',
              width: '100%',
            },
            type: inputType,
            value: toInputValue(activeValue, mode),
          })
        )}
        {mode !== 'date' && clearable && activeValue && !disabled ? (
          <Pressable
            accessibilityLabel={`Limpiar ${label ?? 'fecha'}`}
            className="absolute right-0 h-10 w-10 items-center justify-center"
            onPress={() => emit('')}
          >
            <X
              size={16}
              className="text-muted-foreground"
            />
          </Pressable>
        ) : null}
      </View>
      {mode === 'date' ? (
        <Modal
          transparent
          visible={open}
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View className="flex-1">
            <Pressable
              accessibilityLabel="Cerrar calendario"
              className="absolute inset-0"
              onPress={() => setOpen(false)}
            />
            <View style={{ position: 'absolute', ...calendarPosition }}>
              <Calendar
                value={activeValue ? toInputValue(activeValue, 'date') : null}
                minDate={minDate}
                maxDate={maxDate}
                onSelect={(date) => {
                  emit(DateTime.fromISO(date).toISO() ?? '');
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </NField>
  );
}
