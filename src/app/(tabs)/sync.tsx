import { NButton } from '@/components/forms/NButton';
import { NSyncConnectionNotice } from '@/components/sync/sync-connection-notice';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { formatters } from '@/lib/formatter';
import { exportLocalBackup } from '@/sync/backup';
import { pullNova, useSyncState } from '@/sync';
import { useRouter } from 'expo-router';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react-native';
import { Platform, ScrollView, View } from 'react-native';

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

  const exportBackup = async () => {
    try {
      await exportLocalBackup();
    } catch {
      // El respaldo es best effort: un fallo no debe interrumpir el trabajo.
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-3xl gap-3 pb-20 pt-3"
    >
      <View>
        <Text className="font-poppins-semibold text-lg">Sincronización</Text>
        <Text variant="caption">
          Envía cambios y actualiza los datos locales
        </Text>
      </View>
      <NSyncConnectionNotice />
      <Card className="gap-3 p-3">
        <View className="flex-row items-center gap-2">
          <RefreshCw
            size={17}
            className="text-primary"
          />
          <View className="min-w-0 flex-1">
            <Text variant="small">Actualizar datos</Text>
            <Text variant="caption">
              Envía tus cambios y recibe la información más reciente
            </Text>
          </View>
        </View>
        <NButton
          className="h-9"
          disabled={sync.Status === 'syncing'}
          onPress={() => void synchronize()}
        >
          <RefreshCw
            size={15}
            className="text-primary-foreground"
          />
          <Text>
            {sync.Status === 'syncing'
              ? 'Sincronizando...'
              : 'Sincronizar ahora'}
          </Text>
        </NButton>
        {sync.Error ? (
          <Text className="text-sm text-destructive">{sync.Error}</Text>
        ) : null}
      </Card>
      {sync.LastPull ? (
        <Card className="gap-2 p-3">
          <View className="flex-row items-center gap-2">
            <CheckCircle2
              size={18}
              className="text-success"
            />
            <Text variant="small">Última sincronización</Text>
          </View>
          <Text variant="caption">
            {formatters.datetime(sync.LastPull.FinishedAt)}
          </Text>
          <View className="flex-row justify-between border-t border-border pt-2">
            <Text variant="caption">
              Descargados: {sync.LastPull.Downloaded}
            </Text>
            <Text variant="caption">Enviados: {sync.LastPull.Uploaded}</Text>
          </View>
        </Card>
      ) : null}
      <NButton
        className="h-9"
        variant="outline"
        onPress={() => router.push('/sync-details')}
      >
        <Text>Ver detalles técnicos</Text>
      </NButton>
      {Platform.OS === 'web' ? (
        <NButton
          className="h-9"
          variant="outline"
          onPress={() => void exportBackup()}
        >
          <Download
            size={15}
            className="text-primary-foreground"
          />
          <Text>Exportar respaldo de datos locales</Text>
        </NButton>
      ) : null}
    </ScrollView>
  );
}
