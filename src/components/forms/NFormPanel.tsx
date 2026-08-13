import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';

export interface NFormPanelProps extends PropsWithChildren {
  title: string;
  description?: string | null;
  onClose: () => void;
  footer?: ReactNode;
}

export function NFormPanel({ title, description, onClose, footer, children }: NFormPanelProps) {
  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-semibold text-sm">{title}</Text>
          {description ? <Text className="text-[10px] text-muted-foreground">{description}</Text> : null}
        </View>
        <Button className="h-7 w-7" variant="ghost" size="icon" onPress={onClose} accessibilityLabel="Cerrar formulario">
          <X size={14} className="text-muted-foreground" />
        </Button>
      </View>
      {children}
      {footer ? <View className="flex-row items-center justify-between border-t border-border pt-3">{footer}</View> : null}
    </View>
  );
}
