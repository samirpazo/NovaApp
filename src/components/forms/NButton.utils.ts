import type { ButtonProps } from '@/components/ui/button';

export type NButtonVariant = ButtonProps['variant'] | 'primary';

export function resolveNButtonVariant(
  variant: NButtonVariant | undefined,
): ButtonProps['variant'] {
  return variant === 'primary' ? 'default' : variant;
}
