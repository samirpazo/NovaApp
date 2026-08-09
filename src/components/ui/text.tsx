import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText } from 'react-native';

const textVariants = cva(
  cn('text-foreground text-base', Platform.select({ web: 'select-text' })),
  {
    variants: {
      variant: {
        default: '',
        title: 'text-2xl font-bold',
        heading: 'text-lg font-semibold',
        body: 'text-base leading-6',
        small: 'text-sm font-medium',
        muted: 'text-muted-foreground text-sm',
        caption: 'text-muted-foreground text-xs',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = React.ComponentProps<typeof RNText> &
  VariantProps<typeof textVariants> & { asChild?: boolean };

function Text({ className, asChild = false, variant, ...props }: TextProps) {
  const inheritedClassName = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;

  return (
    <Component
      className={cn(textVariants({ variant }), inheritedClassName, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext, textVariants };
