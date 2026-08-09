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
}

export function NField({ children, label, required, errorMessage, hint, disabled, className }: NFieldProps) {
  return (
    <View className={cn('w-full gap-1.5', className)}>
      {label ? (
        <Label disabled={disabled}>
          {label}
          {required ? <Text className="text-destructive"> *</Text> : null}
        </Label>
      ) : null}
      {children}
      {errorMessage ? (
        <Text className="text-xs text-destructive" role="alert">
          {errorMessage}
        </Text>
      ) : hint ? (
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
}
