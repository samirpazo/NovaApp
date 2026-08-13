import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { pullNova, useSyncState } from '@/sync';
import { useRouter } from 'expo-router';
import { CheckCircle2, RefreshCw, Server } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

export default function SyncTab() {
  const router = useRouter();
  const sync = useSyncState();

  const synchronize = async () => {
    try {
      await pullNova();
    } catch {
      // The normalized error is rendered from the synchronization store.
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="mx-auto w-full max-w-3xl gap-3 px-3 pb-20 pt-3">
      <View>
        <Text className="font-poppins-semibold text-lg">Sincronización</Text>
        <Text variant="caption">Envía cambios y actualiza los datos locales</Text>
      </View>
      <Card className="gap-3 p-3">
        <View className="flex-row items-center gap-2">
          <Server size={17} className="text-primary" />
          <View className="min-w-0 flex-1">
            <Text variant="small">Servidor Nova</Text>
            <Text variant="caption" numberOfLines={1}>{process.env.EXPO_PUBLIC_API_URL}</Text>
          </View>
        </View>
        <Button className="h-9" disabled={sync.Status === 'syncing'} onPress={() => void synchronize()}>
          <RefreshCw size={15} className="text-primary-foreground" />
          <Text>{sync.Status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}</Text>
        </Button>
        {sync.Error ? <Text className="text-sm text-destructive">{sync.Error}</Text> : null}
      </Card>
      {sync.LastPull ? (
        <Card className="gap-2 p-3">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={18} className="text-success" />
            <Text variant="small">Última sincronización</Text>
          </View>
          <Text variant="caption">{new Date(sync.LastPull.FinishedAt).toLocaleString()}</Text>
          <View className="flex-row justify-between border-t border-border pt-2">
            <Text variant="caption">Descargados: {sync.LastPull.Downloaded}</Text>
            <Text variant="caption">Enviados: {sync.LastPull.Uploaded}</Text>
          </View>
        </Card>
      ) : null}
      <Button className="h-9" variant="outline" onPress={() => router.push('/sync-details')}>
        <Text>Ver detalles técnicos</Text>
      </Button>
    </ScrollView>
  );
}
