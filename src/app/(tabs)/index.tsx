import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { View } from 'react-native';

export default function HomeTab() {
  return (
    <View className="flex-1 items-center justify-center bg-background pb-16">
      <View className="items-center opacity-20">
        <Image
          source={require('@/assets/images/logo-nova-monochrome.svg')}
          accessibilityLabel="Logo de Nova"
          contentFit="contain"
          style={{ width: 96, height: 96 }}
        />
        <Text className="mt-3 text-lg font-poppins-semibold">Bienvenido a Nova</Text>
      </View>
    </View>
  );
}
