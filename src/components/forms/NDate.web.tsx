import { DateTime } from 'luxon';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';

import { NButton } from '@/components/forms/NButton';
import { NField } from '@/components/forms/NField';
import { Calendar } from '@/components/ui/calendar';
import { Text } from '@/components/ui/text';
import type { NDateProps } from '@/components/forms/NDate';
import { cn } from '@/lib/utils';

export function NDate({
  label,
  value,
  defaultValue = null,
  onChange,
  placeholder,
  disabled = false,
  mode = 'date',
  showTime = false,
  clearable = false,
  minDate,
  maxDate,
  required,
  errorMessage,
  hint,
  containerClassName,
}: NDateProps) {
  const effectiveMode = showTime && mode === 'date' ? 'datetime' : mode;
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

  const emit = (inputValue: string) => {
    let next = inputValue;
    if (inputValue && effectiveMode === 'time') next = `${inputValue}:00`;
    if (inputValue && effectiveMode !== 'time')
      next = DateTime.fromISO(inputValue).toISO() ?? '';
    if (!controlled) setInternalValue(next || null);
    onChange?.(next);
  };

  const openCalendar = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const calendarWidth = 280;
      const calendarHeight = effectiveMode === 'datetime' ? 360 : 316;
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
    ? effectiveMode === 'datetime'
      ? selectedDate.toFormat('dd/LL/yyyy HH:mm')
      : effectiveMode === 'time'
        ? selectedDate.toFormat('HH:mm')
        : selectedDate.toFormat('dd/LL/yyyy')
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
        <Pressable
          ref={triggerRef}
          accessibilityLabel={label ?? 'Seleccionar fecha'}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          onPress={openCalendar}
          className={cn(
            'h-9 flex-row items-center rounded-md border border-input bg-background px-2.5 sm:h-9',
            errorMessage && 'border-destructive',
          )}
        >
          <CalendarIcon
            size={16}
            className="mr-2 text-muted-foreground"
          />
          <Text
            numberOfLines={1}
            className={`flex-1 font-poppins text-xs ${displayValue ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {displayValue ||
              placeholder ||
              (effectiveMode === 'time'
                ? 'Seleccionar hora...'
                : 'Seleccionar fecha...')}
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
      </View>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1">
          <Pressable
            accessibilityLabel="Cerrar calendario"
            className="absolute inset-0 bg-transparent"
            onPress={() => setOpen(false)}
          />
          <View
            style={{
              position: 'absolute',
              zIndex: 100000,
              ...calendarPosition,
            }}
            className="rounded-lg border border-border bg-card p-3 shadow-xl"
          >
            <Calendar
              value={selectedDate?.isValid ? selectedDate.toISODate() : null}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={(date) => {
                const day = DateTime.fromISO(date);
                const currentHour = selectedDate?.isValid ? selectedDate.hour : 8;
                const currentMinute = selectedDate?.isValid ? selectedDate.minute : 0;
                const next = effectiveMode === 'datetime'
                  ? day.set({ hour: currentHour, minute: currentMinute })
                  : day;
                emit(next.toISO() ?? '');
                if (effectiveMode !== 'datetime') {
                  setOpen(false);
                }
              }}
            />

            {effectiveMode === 'datetime' ? (
              <View className="mt-3 flex-row items-center justify-between border-t border-border/80 pt-2.5">
                <Text className="font-poppins text-xs text-muted-foreground">
                  Hora:
                </Text>
                <View className="flex-row items-center gap-2">
                  <input
                    type="time"
                    aria-label="Hora"
                    value={
                      selectedDate?.isValid
                        ? selectedDate.toFormat('HH:mm')
                        : '08:00'
                    }
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':');
                      const base = selectedDate?.isValid
                        ? selectedDate
                        : DateTime.local();
                      const next = base.set({
                        hour: Number(h) || 0,
                        minute: Number(m) || 0,
                      });
                      emit(next.toISO() ?? '');
                    }}
                    style={{
                      height: 28,
                      borderRadius: 4,
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      padding: '0 6px',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <NButton
                    size="sm"
                    onPress={() => setOpen(false)}
                    className="h-7 px-3"
                  >
                    <Text className="font-poppins-medium text-xs text-primary-foreground">
                      Aceptar
                    </Text>
                  </NButton>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </NField>
  );
}
