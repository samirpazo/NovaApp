import { NField } from '@/components/forms/NField';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View, Text } from 'react-native';

export interface NTextareaProps
  extends Omit<
    TextareaProps,
    'onChange' | 'onChangeText' | 'value' | 'defaultValue'
  > {
  label?: string;
  value?: string | null;
  defaultValue?: string;
  onChange?: (value: string) => void;
  rows?: number;
  numberOfLines?: number;
  maxLength?: number;
  showCounter?: boolean;
  clearable?: boolean;
  required?: boolean;
  errorMessage?: string;
  hint?: string;
  containerClassName?: string;
  labelClassName?: string;
  onClear?: () => void;
}

export const NTextarea = React.forwardRef<
  React.ElementRef<typeof Textarea>,
  NTextareaProps
>(function NTextarea(
  {
    label,
    value,
    defaultValue = '',
    onChange,
    rows = 3,
    numberOfLines,
    maxLength,
    showCounter = false,
    clearable = false,
    required,
    errorMessage,
    hint,
    containerClassName,
    labelClassName,
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
  const lineCount = numberOfLines ?? rows;

  const updateValue = React.useCallback(
    (rawValue: string) => {
      const next = maxLength ? rawValue.slice(0, maxLength) : rawValue;
      if (!controlled) setInternalValue(next);
      onChange?.(next);
    },
    [controlled, maxLength, onChange],
  );

  return (
    <NField
      label={label}
      required={required}
      errorMessage={errorMessage}
      hint={hint}
      className={containerClassName}
      labelClassName={labelClassName}
    >
      <View className="relative w-full">
        <Textarea
          ref={ref}
          value={textValue}
          onChangeText={updateValue}
          numberOfLines={lineCount}
          maxLength={maxLength}
          editable={editable}
          className={cn(
            errorMessage && 'border-destructive',
            className,
          )}
          onBlur={onBlur}
          {...props}
        />
        {clearable && editable && textValue ? (
          <Pressable
            accessibilityLabel={`Limpiar ${label ?? 'texto'}`}
            accessibilityRole="button"
            className="absolute top-2.5 right-2.5 p-1"
            hitSlop={8}
            onPress={() => {
              updateValue('');
              onClear?.();
            }}
          >
            <X size={14} className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </View>
      {showCounter && maxLength ? (
        <View className="flex-row justify-end pt-1">
          <Text className="text-[10px] text-muted-foreground font-poppins">
            {textValue.length}/{maxLength}
          </Text>
        </View>
      ) : null}
    </NField>
  );
});

NTextarea.displayName = 'NTextarea';

