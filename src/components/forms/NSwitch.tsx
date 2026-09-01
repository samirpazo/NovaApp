import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

export interface NSwitchProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function NSwitch({
  value,
  onValueChange,
  label,
  disabled,
  className,
}: NSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      className={cn(
        'flex-row items-center gap-2',
        disabled && 'opacity-50',
        className,
      )}
    >
      <View
        className={cn(
          'h-[18px] w-8 justify-center rounded-full px-0.5',
          value ? 'bg-primary' : 'bg-muted-foreground/35',
        )}
      >
        <View
          className={cn(
            'h-3.5 w-3.5 rounded-full bg-white',
            value && 'self-end',
          )}
        />
      </View>
      {label ? (
        <Text className="text-xs font-poppins-semibold">{label}</Text>
      ) : null}
    </Pressable>
  );
}
