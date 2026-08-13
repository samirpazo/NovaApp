import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'expo-router';
import { Database, LayoutGrid, RefreshCw } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

export default function HomeTab() {
  const router = useRouter();
  const user = useAuthStore((state) => state.Session?.User);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="mx-auto w-full max-w-5xl gap-3 px-3 pb-20 pt-3">
      <View>
        <Text className="font-poppins-semibold text-lg">Inicio</Text>
        <Text variant="caption">Hola, {user?.PrsName || user?.UsrName}.</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Card className="min-w-56 flex-1 gap-2 p-3">
          <LayoutGrid size={18} className="text-primary" />
          <Text variant="small">Módulos</Text>
          <Text variant="caption">Opciones habilitadas para Nova App.</Text>
          <Button className="h-9" variant="outline" onPress={() => router.push('/(tabs)/modules')}>
            <Text>Ver módulos</Text>
          </Button>
        </Card>
        <Card className="min-w-56 flex-1 gap-2 p-3">
          <Database size={18} className="text-success" />
          <Text variant="small">Datos locales</Text>
          <Text variant="caption">Información disponible sin conexión.</Text>
          <Button className="h-9" variant="outline" onPress={() => router.push('/definitions')}>
            <Text>Ver definiciones</Text>
          </Button>
        </Card>
      </View>
      <Button className="h-9" onPress={() => router.push('/(tabs)/sync')}>
        <RefreshCw size={15} className="text-primary-foreground" />
        <Text>Sincronizar ahora</Text>
      </Button>
    </ScrollView>
  );
}
