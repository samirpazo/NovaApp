import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, ChevronRight, Database, LogOut, RefreshCw, Server, ShieldCheck } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database } from '@/database';
import { getLastPull, getSyncConflicts, pullNova, useSyncConflictState, useSyncState } from '@/sync';
type LocalCounts = Record<(typeof SYNC_RESOURCES)[keyof typeof SYNC_RESOURCES], number>;

const emptyCounts: LocalCounts = {
  GenDefinition: 0,
  GenDefinitionDetail: 0,
  RstBranch: 0,
  RstTable: 0,
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
  const { Session, signOut } = useAuthStore();
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

  const synchronize = async () => {
    try {
      await pullNova();
      setCounts(await readLocalCounts());
    } catch {
      // The store exposes the normalized error below.
    }
  };

  const statusLabel = sync.Status === 'syncing' ? 'Sincronizando' : sync.Status === 'success' ? 'Sincronizado' : sync.Status === 'error' ? 'Error' : 'Sin ejecutar';
  const statusColor = sync.Status === 'success' ? 'bg-success' : sync.Status === 'error' ? 'bg-destructive' : sync.Status === 'syncing' ? 'bg-warning' : 'bg-muted-foreground';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-3xl gap-5 px-4 pb-28 pt-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Volver">
            <ArrowLeft size={20} />
          </Button>
          <View className="gap-1">
            <Text variant="title">Sincronización</Text>
            <View className="flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
              <Text variant="muted">{statusLabel} · {Session?.User.FullName || Session?.User.UsrName}</Text>
            </View>
          </View>
        </View>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <Server size={20} className="text-primary" />
            <CardTitle className="text-base">Conexión</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="rounded-md border border-border bg-muted px-3 py-2.5">
              <Text variant="caption">Servidor configurado</Text>
              <Text variant="small" numberOfLines={1}>{process.env.EXPO_PUBLIC_API_URL}</Text>
            </View>
            <Button disabled={!ready || sync.Status === 'syncing'} onPress={synchronize}>
              <RefreshCw size={17} className="text-primary-foreground" />
              <Text>{sync.Status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}</Text>
            </Button>
            {sync.Error ? (
              <Text className="text-sm text-destructive" role="alert">{sync.Error}</Text>
            ) : null}
            <Button
              variant="ghost"
              onPress={async () => {
                await signOut();
                router.replace('/login');
              }}>
              <LogOut size={17} />
              <Text>Cerrar sesión</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="flex-row gap-3">
          <Card className="min-w-0 flex-1">
            <Database size={19} className="mb-3 text-accent" />
            <Text variant="caption">Cursor</Text>
            <Text className="mt-1 text-xl font-semibold">{sync.LastPull?.Cursor ?? 0}</Text>
          </Card>
          <Card className="min-w-0 flex-1">
            <ShieldCheck size={19} className="mb-3 text-success" />
            <Text variant="caption">Descargados</Text>
            <Text className="mt-1 text-xl font-semibold">{sync.LastPull?.Downloaded ?? 0}</Text>
          </Card>
          <Card className="min-w-0 flex-1">
            <RefreshCw size={19} className="mb-3 text-primary" />
            <Text variant="caption">Páginas</Text>
            <Text className="mt-1 text-xl font-semibold">{sync.LastPull?.Pages ?? 0}</Text>
          </Card>
        </View>

        <View className="flex-row items-center justify-between border-y border-border py-3">
          <Text variant="small">Cambios enviados</Text>
          <Text className="font-semibold">{sync.LastPull?.Uploaded ?? 0}</Text>
        </View>

        <Button variant="outline" className="h-14 justify-start px-4" onPress={() => router.push('/conflicts')}>
          <AlertTriangle size={18} className={conflictCount ? 'text-warning' : 'text-muted-foreground'} />
          <View className="min-w-0 flex-1 items-start">
            <Text variant="small">Conflictos</Text>
            <Text variant="caption">{conflictCount} pendiente{conflictCount === 1 ? '' : 's'}</Text>
          </View>
          <ChevronRight size={18} />
        </Button>

        <Card>
          <CardHeader><CardTitle className="text-base">Registros locales</CardTitle></CardHeader>
          <CardContent className="gap-3">
            {Object.entries(counts).map(([resource, count]) => (
              <View key={resource} className="flex-row items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0">
                <Text variant="small">{resource}</Text>
                <Text className="font-semibold">{count}</Text>
              </View>
            ))}
          </CardContent>
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
