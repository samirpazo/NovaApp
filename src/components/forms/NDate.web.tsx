import { DateTime } from 'luxon';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { NField } from '@/components/forms/NField';
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
        {React.createElement('input', {
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
            opacity: disabled ? 0.5 : 1,
            padding: clearable && activeValue ? '0 40px 0 12px' : '0 12px',
            width: '100%',
          },
          type: inputType,
          value: toInputValue(activeValue, mode),
        })}
        {clearable && activeValue && !disabled ? (
          <Pressable
            accessibilityLabel={`Limpiar ${label ?? 'fecha'}`}
            className="absolute right-0 h-10 w-10 items-center justify-center"
            onPress={() => emit('')}
          >
            <X
              size={17}
              className="text-muted-foreground"
            />
          </Pressable>
        ) : null}
      </View>
    </NField>
  );
}
