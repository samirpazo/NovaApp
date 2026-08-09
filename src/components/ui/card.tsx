import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

function Card({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn('rounded-lg border border-border bg-card p-4', className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('gap-1', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="heading" className={className} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="muted" className={className} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('mt-4', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle };
