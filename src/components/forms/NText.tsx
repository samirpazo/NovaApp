import { NField } from '@/components/forms/NField';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export interface NTextProps extends Omit<
  InputProps,
  'onChange' | 'onChangeText' | 'value' | 'defaultValue'
> {
  label?: string;
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  uppercase?: boolean;
  number?: boolean;
  decimal?: boolean;
  maxDecimal?: number;
  trimSpaces?: boolean;
  noSpaces?: boolean;
  singleAt?: boolean;
  clearable?: boolean;
  required?: boolean;
  errorMessage?: string;
  hint?: string;
  containerClassName?: string;
  labelClassName?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onClear?: () => void;
}

function normalizeValue(
  value: string,
  props: Pick<
    NTextProps,
    'uppercase' | 'number' | 'decimal' | 'maxDecimal' | 'noSpaces' | 'singleAt'
  >,
) {
  let next = value;
  if (props.noSpaces) next = next.replace(/\s/g, '');
  if (props.singleAt) {
    const [first, ...rest] = next.split('@');
    next = rest.length ? `${first}@${rest.join('')}` : first;
  }
  if (props.number) next = next.replace(/\D/g, '');
  if (props.decimal) {
    next = next.replace(',', '.').replace(/[^\d.]/g, '');
    const [integer = '', ...decimals] = next.split('.');
    const decimalPart = decimals.join('');
    next = decimals.length
      ? `${integer}.${props.maxDecimal === undefined || props.maxDecimal < 0 ? decimalPart : decimalPart.slice(0, props.maxDecimal)}`
      : integer;
  }
  return props.uppercase ? next.toUpperCase() : next;
}

export const NText = React.forwardRef<
  React.ElementRef<typeof Input>,
  NTextProps
>(function NText(
  {
    label,
    value,
    defaultValue = '',
    onChange,
    uppercase,
    number,
    decimal,
    maxDecimal = -1,
    trimSpaces,
    noSpaces,
    singleAt,
    clearable = true,
    required,
    errorMessage,
    hint,
    containerClassName,
    labelClassName,
    prefix,
    suffix,
    onClear,
    editable = true,
    className,
    onBlur,
    ...props
  },
  ref,
) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(
    String(defaultValue ?? ''),
  );
  const textValue = controlled ? String(value ?? '') : internalValue;

  const updateValue = React.useCallback(
    (rawValue: string) => {
      const next = normalizeValue(rawValue, {
        uppercase,
        number,
        decimal,
        maxDecimal,
        noSpaces,
        singleAt,
      });
      if (!controlled) setInternalValue(next);
      onChange?.(next);
    },
    [
      controlled,
      decimal,
      maxDecimal,
      noSpaces,
      number,
      onChange,
      singleAt,
      uppercase,
    ],
  );

  return (
    <NField
      label={label}
      required={required}
      errorMessage={errorMessage}
      hint={hint}
      disabled={!editable}
      className={containerClassName}
      labelClassName={labelClassName}
    >
      <View className="flex-row items-center gap-2">
        {prefix ? <View className="shrink-0">{prefix}</View> : null}
        <View className="relative flex-1 justify-center">
          <Input
            ref={ref}
            value={textValue}
            onChangeText={updateValue}
            onBlur={(event) => {
              if (trimSpaces) updateValue(textValue.trim());
              onBlur?.(event);
            }}
            editable={editable}
            keyboardType={
              number
                ? 'number-pad'
                : decimal
                  ? 'decimal-pad'
                  : props.keyboardType
            }
            aria-invalid={Boolean(errorMessage)}
            className={cn(
              'h-8 px-2.5 text-xs',
              (suffix || (clearable && textValue && editable)) && 'pr-8',
              errorMessage && 'border-destructive',
              className,
            )}
            {...props}
          />
          {suffix ? (
            <View className="absolute right-0 h-8 w-8 items-center justify-center">
              {suffix}
            </View>
          ) : clearable && textValue && editable ? (
            <Pressable
              accessibilityLabel={`Limpiar ${label ?? 'campo'}`}
              className="absolute right-0 h-8 w-8 items-center justify-center"
              hitSlop={8}
              onPress={() => {
                updateValue('');
                onClear?.();
              }}
            >
              <X
                size={14}
                className="text-muted-foreground"
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </NField>
  );
});
