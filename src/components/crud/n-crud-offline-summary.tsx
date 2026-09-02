import { useRouter } from 'expo-router';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react-native';
import { DateTime } from 'luxon';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  filterResourceConflicts,
  selectSyncConflicts,
} from '@/components/crud/n-crud-offline-selectors';
import type { SyncResource } from '@/contracts/sync';
import { pullNova } from '@/sync/pull';
import { useSyncIndicators } from '@/sync/useSyncIndicators';
import { useSyncConflictState } from '@/sync/conflicts';
import { useSyncState } from '@/sync/state';

export function NCrudOfflineSummary({ resource }: { resource: SyncResource }) {
  const router = useRouter();
  const { pendingChanges } = useSyncIndicators();
  const allConflicts = useSyncConflictState(selectSyncConflicts);
  const conflicts = React.useMemo(
    () => filterResourceConflicts(allConflicts, resource),
    [allConflicts, resource],
  );
  const status = useSyncState((state) => state.Status);
  const error = useSyncState((state) => state.Error);
  const lastPull = useSyncState((state) => state.LastPull);
  const [retrying, setRetrying] = React.useState(false);
  const syncing = status === 'syncing' || retrying;

  const synchronize = async () => {
    if (syncing) return;
    setRetrying(true);
    try {
      await pullNova();
    } catch {
      // pullNova already exposes the user-facing error through useSyncState.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View className="gap-2 border-b border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center">
      <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Offline-first
        </Text>
        <Text className="text-xs text-muted-foreground">
          {syncing
            ? 'Sincronizando cambios…'
            : pendingChanges > 0
              ? `${pendingChanges} cambio${pendingChanges === 1 ? '' : 's'} pendiente${pendingChanges === 1 ? '' : 's'} en el dispositivo`
              : 'Datos locales al día'}
        </Text>
        {lastPull && !syncing ? (
          <Text className="text-[10px] text-muted-foreground">
            Última sincronización:{' '}
            {DateTime.fromISO(lastPull.FinishedAt).toLocaleString(
              DateTime.DATETIME_SHORT,
            )}
          </Text>
        ) : null}
        {error ? (
          <View className="flex-row items-center gap-1">
            <AlertTriangle
              size={12}
              className="text-destructive"
            />
            <Text
              numberOfLines={1}
              className="max-w-80 text-xs text-destructive"
            >
              {error}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        {conflicts.length ? (
          <Button
            variant="outline"
            className="h-8 px-3"
            onPress={() => router.push('/conflicts')}
          >
            <AlertTriangle
              size={14}
              className="text-warning"
            />
            <Text className="text-xs">Resolver {conflicts.length}</Text>
          </Button>
        ) : null}
        <Button
          variant={error ? 'destructive' : 'outline'}
          className="h-8 px-3"
          disabled={syncing}
          onPress={() => void synchronize()}
        >
          {error ? <RotateCcw size={14} /> : <RefreshCw size={14} />}
          <Text className="text-xs">
            {syncing ? 'Sincronizando…' : error ? 'Reintentar' : 'Sincronizar'}
          </Text>
        </Button>
      </View>
    </View>
  );
}
