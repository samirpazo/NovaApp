import { useAuthStore } from '@/auth/store';
import {
  activateAccountDatabase,
  deactivateAccountDatabase,
} from '@/database';
import { Text } from '@/components/ui/text';
import { NButton } from '@/components/forms/NButton';
import { getSyncConnection } from '@/sync/config';
import { activateSyncScope } from '@/sync/scope';
import { getSyncConflicts, useSyncConflictState } from '@/sync/conflicts';
import { useSyncState } from '@/sync/state';
import { usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  flushPendingAppearance,
  loadServerAppearance,
  useAppearanceStore,
} from '@/theme/appearance';

export function AuthGate({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { IsAuthenticated, IsReady, initialize, Session } = useAuthStore();
  const commitAppearance = useAppearanceStore((state) => state.commit);
  const hydrateAppearance = useAppearanceStore((state) => state.hydrate);
  const [scopeReadyFor, setScopeReadyFor] = React.useState<{
    userId: number;
    personId: number;
  } | null>(null);
  const [scopeError, setScopeError] = React.useState<string | null>(null);
  const userId = Session?.User.UsrID ?? null;
  const personId = Session?.User.PrsID ?? 0;
  const appearanceUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (!IsReady) return;
    if (!IsAuthenticated && pathname !== '/login') router.replace('/login');
    if (IsAuthenticated && pathname === '/login') router.replace('/');
  }, [IsAuthenticated, IsReady, pathname, router]);

  React.useEffect(() => {
    if (!IsReady) return;
    if (!IsAuthenticated || !userId) {
      setScopeReadyFor(null);
      setScopeError(null);
      deactivateAccountDatabase();
      useSyncState.getState().reset();
      appearanceUserRef.current = null;
      useSyncConflictState.getState().setConflicts([]);
      void hydrateAppearance(null);
      return;
    }
    let cancelled = false;
    setScopeReadyFor(null);
    setScopeError(null);
    useSyncState.getState().reset();
    useSyncConflictState.getState().setConflicts([]);

    void (async () => {
      const connection = await getSyncConnection();
      if (
        cancelled ||
        useAuthStore.getState().Session?.User.UsrID !== userId
      )
        return;
      if (!connection)
        throw new Error('No se encontró la conexión de Nova para esta cuenta.');
      const active = await activateAccountDatabase(
        connection,
        {
          BaseUrl: connection.BaseUrl,
          UsrID: userId,
          PrsID: personId,
        },
        () =>
          !cancelled &&
          useAuthStore.getState().Session?.User.UsrID === userId,
      );
      await hydrateAppearance(userId, active.identityKey);
      if (
        cancelled ||
        useAuthStore.getState().Session?.User.UsrID !== userId
      )
        return;
      const result = await activateSyncScope(
        active.database,
        connection,
        userId,
        personId,
        () => useAuthStore.getState().Session?.User.UsrID === userId,
      );
      if (cancelled) return;
      if (!result.ready) {
        setScopeError(
          'No se pudo activar el almacenamiento local de esta cuenta.',
        );
        return;
      }
      if (useAuthStore.getState().Session?.User.UsrID !== userId) return;
      await getSyncConflicts();
      if (
        !cancelled &&
        useAuthStore.getState().Session?.User.UsrID === userId
      )
        setScopeReadyFor({ userId, personId });
    })().catch((error: unknown) => {
      if (!cancelled)
        setScopeError(
          error instanceof Error
            ? error.message
            : 'No se pudo preparar el almacenamiento local de esta cuenta.',
        );
    });

    return () => {
      cancelled = true;
    };
  }, [
    IsAuthenticated,
    IsReady,
    Session?.User.UsrID,
    Session?.User.PrsID,
    hydrateAppearance,
    personId,
    userId,
  ]);

  React.useEffect(() => {
    if (
      !IsAuthenticated ||
      !userId ||
      scopeReadyFor?.userId !== userId ||
      scopeReadyFor.personId !== personId
    ) return;
    const identityKey = useAppearanceStore.getState().identityKey;
    if (!identityKey || appearanceUserRef.current === identityKey) return;
    appearanceUserRef.current = identityKey;
    let cancelled = false;
    const revision = useAppearanceStore.getState().revision;
    void (async () => {
      const flushed = await flushPendingAppearance(userId, identityKey);
      if (!flushed || cancelled) return;
      const preferences = await loadServerAppearance(userId, identityKey);
      if (
        !preferences ||
        cancelled ||
        useAuthStore.getState().Session?.User.UsrID !== userId ||
        useAppearanceStore.getState().revision !== revision
      )
        return;
      await commitAppearance(preferences);
    })();
    return () => {
      cancelled = true;
    };
  }, [IsAuthenticated, Session?.User.UsrID, Session?.User.PrsID, commitAppearance, personId, scopeReadyFor, userId]);

  if (!IsReady) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator />
        <Text variant="muted">Cargando sesión...</Text>
      </View>
    );
  }

  if (
    IsAuthenticated &&
    userId &&
    (scopeReadyFor?.userId !== userId || scopeReadyFor.personId !== personId)
  ) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center" variant="muted">
          {scopeError ?? 'Preparando los datos locales de la cuenta...'}
        </Text>
        {scopeError ? (
          <NButton
            variant="outline"
            onPress={() => void useAuthStore.getState().signOut()}
          >
            Cerrar sesión
          </NButton>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  if (
    (!IsAuthenticated && pathname !== '/login') ||
    (IsAuthenticated && pathname === '/login')
  ) {
    return <View className="flex-1 bg-background" />;
  }

  return children;
}
