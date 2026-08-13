import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { database } from '@/database';
import { getLastPull, useSyncState } from '@/sync';
import { hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import { useFocusEffect, useRouter } from 'expo-router';
import { RefreshCw, UserRound } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.Session?.User);
  const sync = useSyncState();
  const [pending, setPending] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getLastPull(), hasUnsyncedChanges({ database })]).then(
        ([lastPull, hasPending]) => {
          if (!active) return;
          if (lastPull && !useSyncState.getState().LastPull) {
            useSyncState.getState().completePull(lastPull);
          }
          setPending(hasPending);
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  React.useEffect(() => {
    if (sync.Status !== 'success') return;
    void hasUnsyncedChanges({ database }).then(setPending);
  }, [sync.Status, sync.LastPull?.FinishedAt]);

  const label =
    sync.Status === 'syncing'
      ? 'Sincronizando'
      : sync.Status === 'error'
        ? 'Error de sincronización'
        : pending
          ? 'Cambios pendientes'
          : sync.LastPull
            ? 'Sincronizado'
            : 'Sin sincronización inicial';
  const dotClass =
    sync.Status === 'error'
      ? 'bg-destructive'
      : sync.Status === 'syncing' || pending || !sync.LastPull
        ? 'bg-warning'
        : 'bg-success';

  return (
    <SafeAreaView edges={['top']} className="border-b border-border bg-background">
      <View className="mx-auto h-[52px] w-full max-w-5xl flex-row items-center gap-2.5 px-3">
        <View className="h-8 w-8 items-center justify-center rounded-md bg-muted">
          <UserRound size={16} className="text-foreground" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="small" numberOfLines={1}>
            {user?.FullName || user?.UsrName || 'Nova'}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${dotClass}`} />
            <Text variant="caption" numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.push('/(tabs)/sync')}
          accessibilityLabel="Ver sincronización">
          <RefreshCw
            size={17}
            className="text-foreground"
            style={sync.Status === 'syncing' ? { opacity: 0.55 } : undefined}
          />
        </Button>
      </View>
    </SafeAreaView>
  );
}
