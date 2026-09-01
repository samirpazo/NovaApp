import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText } from 'react-native';

const textVariants = cva(
  cn(
    'font-poppins text-foreground text-base',
    Platform.select({ web: 'select-text' }),
  ),
  {
    variants: {
      variant: {
        default: '',
        title: 'font-poppins-bold text-2xl',
        heading: 'font-poppins-semibold text-lg',
        body: 'text-base leading-6',
        small: 'font-poppins-semibold text-sm',
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
