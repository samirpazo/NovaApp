import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { Building2, Database, RefreshCw, Settings2, TableProperties } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth';

const modules = [
  {
    name: 'Definiciones',
    description: 'Parámetros generales disponibles localmente',
    icon: Database,
    color: '#2563eb',
    route: '/definitions',
  },
  {
    name: 'Sucursales',
    description: 'Configuración de la sucursal activa',
    icon: Building2,
    color: '#0f766e',
    route: '/branches',
  },
  {
    name: 'Mesas',
    description: 'Consulta del salón sincronizado',
    icon: TableProperties,
    color: '#b45309',
    route: '/tables',
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.Session?.User);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
        <View className="h-16 flex-row items-center justify-between">
          <View>
            <Text variant="title">Nova</Text>
            <Text variant="caption">{user?.FullName || user?.UsrName || 'Datos disponibles sin conexión'}</Text>
          </View>
          <Button variant="ghost" size="icon" accessibilityLabel="Configuración">
            <Settings2 size={20} color="#64748b" />
          </Button>
        </View>

        <View className="mb-6 flex-row items-center justify-between border-y border-border py-3">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-warning" />
            <Text variant="small">Pendiente de sincronización inicial</Text>
          </View>
          <Button variant="outline" size="sm" onPress={() => router.push('/explore')}>
            <RefreshCw size={16} color="#2563eb" />
            <Text>Sincronizar</Text>
          </Button>
        </View>

        <Text variant="heading" className="mb-3">
          Módulos
        </Text>
        <View className="gap-3">
          {modules.map(({ name, description, icon: Icon, color, route }) => (
            <Pressable key={name} disabled={!route} onPress={() => route && router.push(route)}>
              <Card className="min-h-24 flex-row items-center gap-4">
                <View className="h-11 w-11 items-center justify-center rounded-md bg-muted">
                  <Icon size={22} color={color} />
                </View>
                <CardHeader className="min-w-0 flex-1">
                  <CardTitle>{name}</CardTitle>
                  <CardDescription numberOfLines={2}>{description}</CardDescription>
                </CardHeader>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
