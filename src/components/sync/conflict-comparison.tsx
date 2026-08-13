import { Cloud, Smartphone } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface ConflictVersionProps {
  kind: 'local' | 'server';
  value: string;
}

function ConflictVersion({ kind, value }: ConflictVersionProps) {
  const local = kind === 'local';
  const Icon = local ? Smartphone : Cloud;

  return (
    <View className="min-w-0 flex-1 gap-2 py-1">
      <View className="flex-row items-center gap-2">
        <Icon size={14} className={local ? 'text-primary' : 'text-muted-foreground'} />
        <Text className="text-xs text-muted-foreground">
          {local ? 'En este dispositivo' : 'En el servidor'}
        </Text>
      </View>
      <Text className="text-sm leading-5" selectable>{value}</Text>
    </View>
  );
}

interface ConflictComparisonProps {
  field: string;
  localValue: string;
  serverValue: string;
}

export function ConflictComparison({ field, localValue, serverValue }: ConflictComparisonProps) {
  return (
    <View className="gap-3 border-t border-border py-4 first:border-t-0">
      <Text className="text-[10px] font-poppins-bold uppercase tracking-[1.5px] text-muted-foreground">{field}</Text>
      <View className="gap-5 md:flex-row md:gap-4">
        <ConflictVersion kind="local" value={localValue} />
        <ConflictVersion kind="server" value={serverValue} />
      </View>
    </View>
  );
}
