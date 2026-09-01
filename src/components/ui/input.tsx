import { cn } from '@/lib/utils';
import * as React from 'react';
import { Platform, TextInput } from 'react-native';

type InputProps = React.ComponentProps<typeof TextInput>;

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  function Input({ className, editable = true, ...props }, ref) {
    return (
      <TextInput
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 font-poppins text-base text-foreground',
          'placeholder:text-muted-foreground',
          Platform.select({
            web: 'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
          }),
          !editable && 'opacity-50',
          className,
        )}
        editable={editable}
        placeholderTextColor="hsl(215 12% 44%)"
        {...props}
      />
    );
  },
);

export { Input };
export type { InputProps };
