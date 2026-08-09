import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group flex-row items-center justify-center gap-2 rounded-md',
    Platform.select({ web: 'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring' }),
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary active:opacity-90',
        secondary: 'bg-secondary active:opacity-80',
        outline: 'border border-border bg-background active:bg-muted',
        ghost: 'active:bg-muted',
        destructive: 'bg-destructive active:opacity-90',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const buttonTextVariants = cva('text-sm font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, disabled, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        disabled={disabled}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
