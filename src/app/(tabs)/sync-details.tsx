import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, CloudDownload, CloudUpload, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database } from '@/database';
import { getLastPull, getSyncConflicts, pullNova, useSyncConflictState, useSyncState } from '@/sync';
import { syncRecoveryConfirmation } from '@/sync/recovery';
type LocalCounts = Record<(typeof SYNC_RESOURCES)[keyof typeof SYNC_RESOURCES], number>;

const emptyCounts: LocalCounts = {
  GenDefinition: 0,
  GenDefinitionDetail: 0,
  RstBranch: 0,
  RstTable: 0,
};

const resourceLabels: Record<keyof LocalCounts, string> = {
  GenDefinition: 'Definiciones',
  GenDefinitionDetail: 'Valores de definiciones',
  RstBranch: 'Sucursales',
  RstTable: 'Mesas',
};

async function readLocalCounts(): Promise<LocalCounts> {
  const entries = await Promise.all(
    Object.values(SYNC_RESOURCES).map(async (resource) => [resource, await database.get(resource).query().fetchCount()] as const),
  );
  return Object.fromEntries(entries) as LocalCounts;
}

export default function SyncScreen() {
  const router = useRouter();
  const sync = useSyncState();
  const user = useAuthStore((state) => state.Session?.User);
  const [counts, setCounts] = React.useState<LocalCounts>(emptyCounts);
  const [ready, setReady] = React.useState(false);
  const conflictCount = useSyncConflictState((state) => state.Conflicts.length);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([getLastPull(), readLocalCounts(), getSyncConflicts()]).then(
      ([lastPull, localCounts]) => {
        if (!mounted) return;
        if (lastPull) useSyncState.getState().completePull(lastPull);
        setCounts(localCounts);
        setReady(true);
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  const synchronize = async (forceBootstrap = false) => {
    try {
      await pullNova({ forceBootstrap });
      setCounts(await readLocalCounts());
    } catch {
      // The store exposes the normalized error below.
    }
  };

  const confirmServerRecovery = () => {
    const execute = () => void synchronize(true);
    if (Platform.OS === 'web') {
      if (globalThis.confirm(syncRecoveryConfirmation.message)) execute();
      return;
    }
    Alert.alert(syncRecoveryConfirmation.title, syncRecoveryConfirmation.message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: syncRecoveryConfirmation.confirmLabel, onPress: execute },
    ]);
  };

  const statusLabel = sync.Status === 'syncing' ? 'Sincronizando' : sync.Status === 'success' ? 'Sincronizado' : sync.Status === 'error' ? 'Error' : 'Sin ejecutar';
  const statusColor = sync.Status === 'success' ? 'bg-success' : sync.Status === 'error' ? 'bg-destructive' : sync.Status === 'syncing' ? 'bg-warning' : 'bg-muted-foreground';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-3xl gap-3 pb-24 pt-3" keyboardShouldPersistTaps="handled">
        <View>
          <Text className="font-poppins-semibold text-lg">Sincronización</Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${statusColor}`} />
            <Text variant="caption" numberOfLines={1}>
              {statusLabel} · {user?.FullName || user?.UsrName}
            </Text>
          </View>
        </View>

        <Card className="gap-3 p-3">
          <View className="flex-row items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            <View className="min-w-0 flex-1">
              <Text variant="small">Actualizar datos</Text>
              <Text variant="caption">Envía tus cambios y recibe la información más reciente</Text>
            </View>
          </View>
          <Button className="h-9" disabled={!ready || sync.Status === 'syncing'} onPress={() => void synchronize()}>
            <RefreshCw size={15} className="text-primary-foreground" />
            <Text>{sync.Status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}</Text>
          </Button>
          <Button variant="outline" className="h-9" disabled={!ready || sync.Status === 'syncing'} onPress={confirmServerRecovery}>
            <CloudDownload size={15} className="text-foreground" />
            <Text>Recuperar datos del servidor</Text>
          </Button>
          <Text variant="caption">Acción técnica: vuelve a descargar el estado completo y conserva cambios offline pendientes.</Text>
          {sync.Error ? <Text className="text-xs text-destructive" role="alert">{sync.Error}</Text> : null}
        </Card>

        <View className="flex-row overflow-hidden rounded-md border border-border bg-card">
          <View className="min-w-0 flex-1 gap-0.5 border-r border-border p-3">
            <CloudDownload size={15} className="text-primary" />
            <Text variant="caption">Recibidos</Text>
            <Text className="font-poppins-semibold text-base">{sync.LastPull?.Downloaded ?? 0}</Text>
          </View>
          <View className="min-w-0 flex-1 gap-0.5 border-r border-border p-3">
            <CloudUpload size={15} className="text-success" />
            <Text variant="caption">Enviados</Text>
            <Text className="font-poppins-semibold text-base">{sync.LastPull?.Uploaded ?? 0}</Text>
          </View>
          <View className="min-w-0 flex-1 gap-0.5 p-3">
            <AlertTriangle size={15} className={conflictCount ? 'text-warning' : 'text-muted-foreground'} />
            <Text variant="caption">Conflictos</Text>
            <Text className="font-poppins-semibold text-base">{conflictCount}</Text>
          </View>
        </View>

        {sync.LastPull ? (
          <Text variant="caption" className="text-center">
            Duración de la última sincronización: {((sync.LastPull.DurationMs ?? 0) / 1000).toFixed(1)} s · {sync.LastPull.Pages} página{sync.LastPull.Pages === 1 ? '' : 's'}
          </Text>
        ) : null}

        <Button variant="outline" className="h-12 justify-start px-3" onPress={() => router.push('/conflict-resolution')}>
          <AlertTriangle size={16} className={conflictCount ? 'text-warning' : 'text-muted-foreground'} />
          <View className="min-w-0 flex-1 items-start">
            <Text variant="small">Conflictos</Text>
            <Text variant="caption">{conflictCount} pendiente{conflictCount === 1 ? '' : 's'}</Text>
          </View>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Button>

        <Card className="p-3">
          <Text variant="small" className="mb-1">Registros locales</Text>
          {Object.entries(counts).map(([resource, count]) => (
            <View key={resource} className="flex-row items-center justify-between border-b border-border py-2 last:border-b-0 last:pb-0">
              <Text variant="caption">{resourceLabels[resource as keyof LocalCounts]}</Text>
              <Text className="font-poppins-semibold text-xs">{count}</Text>
            </View>
          ))}
        </Card>

        {sync.LastPull ? (
          <Text variant="caption" className="text-center">
            Última ejecución: {new Date(sync.LastPull.FinishedAt).toLocaleString()}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
