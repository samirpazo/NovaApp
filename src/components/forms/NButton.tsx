import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react-native';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolveNButtonVariant, type NButtonVariant } from './NButton.utils';

export type { NButtonVariant } from './NButton.utils';

export interface NButtonProps extends Omit<ButtonProps, 'children' | 'variant'> {
  variant?: NButtonVariant;
  isLoading?: boolean;
  children?: ReactNode;
}

export function NButton({
  className,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  disabled,
  accessibilityState,
  children,
  ...props
}: NButtonProps) {
  const resolvedVariant = resolveNButtonVariant(variant);
  const isDisabled = disabled || isLoading;
  const spinnerColor =
    resolvedVariant === 'default' || resolvedVariant === 'destructive'
      ? 'text-primary-foreground'
      : 'text-foreground';

  return (
    <Button
      {...props}
      variant={resolvedVariant}
      size={size}
      disabled={isDisabled}
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        busy: isLoading,
      }}
      className={cn(
        size === 'default' && 'h-8 px-3',
        size === 'sm' && 'h-7 px-2.5',
        size === 'lg' && 'h-10 px-5',
        size === 'icon' && 'h-8 w-8',
        className,
      )}
    >
      {isLoading ? (
        <LoaderCircle
          size={16}
          className={cn('animate-spin', spinnerColor)}
        />
      ) : null}
      {children}
    </Button>
  );
}
