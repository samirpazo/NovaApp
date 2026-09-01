import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/theme-toggle';
import { getLastPull, pullNova, useSyncState } from '@/sync';
import { useFocusEffect } from 'expo-router';
import { RefreshCw, UserRound } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppHeaderProps {
  pendingChanges: number;
  sceneGutter: number;
}

const badge = (count: number) => (count > 99 ? '99+' : String(count));

export function AppHeader({ pendingChanges, sceneGutter }: AppHeaderProps) {
  const user = useAuthStore((state) => state.Session?.User);
  const sync = useSyncState();
  const pending = pendingChanges > 0;

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void getLastPull().then((lastPull) => {
        if (!active) return;
        if (lastPull && !useSyncState.getState().LastPull) {
          useSyncState.getState().completePull(lastPull);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

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
    <SafeAreaView
      edges={['top']}
      className="border-b border-border bg-background"
      style={{ marginHorizontal: -sceneGutter }}
    >
      <View className="mx-auto h-[52px] w-full max-w-5xl flex-row items-center gap-2.5 px-3">
        <View className="h-8 w-8 items-center justify-center rounded-md bg-muted">
          <UserRound
            size={16}
            className="text-foreground"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            variant="small"
            numberOfLines={1}
          >
            {user?.FullName || user?.UsrName || 'Nova'}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${dotClass}`} />
            <Text
              variant="caption"
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        </View>
        <ThemeToggle />
        <View className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={sync.Status === 'syncing'}
            onPress={() => void pullNova().catch(() => undefined)}
            accessibilityLabel={
              sync.Status === 'syncing' ? 'Sincronizando' : 'Sincronizar ahora'
            }
          >
            <RefreshCw
              size={17}
              className={
                sync.Status === 'syncing'
                  ? 'animate-spin text-foreground'
                  : 'text-foreground'
              }
              style={sync.Status === 'syncing' ? { opacity: 0.55 } : undefined}
            />
          </Button>
          {pending ? (
            <View className="absolute -right-1 -top-1 min-w-4 items-center rounded-full bg-warning px-1">
              <Text className="text-[8px] leading-4 text-zinc-950">
                {badge(pendingChanges)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
