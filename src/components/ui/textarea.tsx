import * as React from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

type TextareaProps = TextInputProps;

const Textarea = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  TextareaProps
>(function Textarea(
  {
    className,
    multiline = true,
    numberOfLines = 3,
    editable = true,
    ...props
  },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      className={cn(
        'w-full min-h-[76px] rounded-md border border-input bg-background px-3 py-2 font-poppins text-xs text-foreground',
        'placeholder:text-muted-foreground',
        Platform.select({
          web: 'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-y',
        }),
        !editable && 'opacity-60 cursor-not-allowed',
        className,
      )}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      placeholderTextColor="hsl(215 12% 44%)"
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };

