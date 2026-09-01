import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

export interface NFieldProps extends PropsWithChildren {
  label?: string;
  required?: boolean;
  errorMessage?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
}

export function NField({
  children,
  label,
  required,
  errorMessage,
  hint,
  disabled,
  className,
  labelClassName,
}: NFieldProps) {
  return (
    <View className={cn('w-full gap-1', className)}>
      {label ? (
        <Label
          disabled={disabled}
          className={cn('text-[11px] font-poppins-semibold', labelClassName)}
        >
          {label}
          {required ? <Text className="text-destructive"> *</Text> : null}
        </Label>
      ) : null}
      {children}
      {errorMessage ? (
        <Text
          className="text-[10px] text-destructive"
          role="alert"
        >
          {errorMessage}
        </Text>
      ) : hint ? (
        <Text className="text-[10px] text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
}
