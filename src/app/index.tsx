import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/theme-toggle';
import { database } from '@/database';
import { getLastPull } from '@/sync';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import { useFocusEffect, useRouter } from 'expo-router';
import { Building2, Database, Palette, RefreshCw, TableProperties } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HomeSyncStatus = 'initial' | 'pending' | 'synced';

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
  const [syncStatus, setSyncStatus] = React.useState<HomeSyncStatus>('initial');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getLastPull(), hasUnsyncedChanges({ database })]).then(([lastPull, hasPendingChanges]) => {
        if (!active) return;
        setSyncStatus(!lastPull ? 'initial' : hasPendingChanges ? 'pending' : 'synced');
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const syncLabel = syncStatus === 'initial'
    ? 'Pendiente de sincronización inicial'
    : syncStatus === 'pending'
      ? 'Cambios pendientes de sincronización'
      : 'Sincronizado';
  const syncColor = syncStatus === 'synced' ? 'bg-success' : 'bg-warning';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
        <View className="h-16 flex-row items-center justify-between">
          <View>
            <Text variant="title">Nova</Text>
            <Text variant="caption">{user?.FullName || user?.UsrName || 'Datos disponibles sin conexión'}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Button variant="ghost" size="icon" onPress={() => router.push('/appearance')} accessibilityLabel="Personalización"><Palette size={18} className="text-foreground" /></Button>
            <ThemeToggle />
          </View>
        </View>

        <View className="mb-6 flex-row items-center justify-between border-y border-border py-3">
          <View className="flex-row items-center gap-2">
            <View className={`h-2.5 w-2.5 rounded-full ${syncColor}`} />
            <Text variant="small">{syncLabel}</Text>
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
