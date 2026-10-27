import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import * as React from 'react';

function Label({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Text>) {
  return (
    <LabelPrimitive.Root
      disabled={disabled}
      className="flex-row items-center"
    >
      <LabelPrimitive.Text
        className={cn('text-sm font-medium text-foreground', className)}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
