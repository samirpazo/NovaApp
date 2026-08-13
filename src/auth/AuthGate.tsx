import { useAuthStore } from '@/auth/store';
import { Text } from '@/components/ui/text';
import { usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { flushPendingAppearance, loadServerAppearance, useAppearanceStore } from '@/theme/appearance';

export function AuthGate({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { IsAuthenticated, IsReady, initialize, Session } = useAuthStore();
  const commitAppearance = useAppearanceStore((state) => state.commit);
  const appearanceUserRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (!IsReady) return;
    if (!IsAuthenticated && pathname !== '/login') router.replace('/login');
    if (IsAuthenticated && pathname === '/login') router.replace('/');
  }, [IsAuthenticated, IsReady, pathname, router]);

  React.useEffect(() => {
    const userId = Session?.User.UsrID;
    if (!IsAuthenticated || !userId) {
      appearanceUserRef.current = null;
      return;
    }
    if (appearanceUserRef.current === userId) return;
    appearanceUserRef.current = userId;

    const revision = useAppearanceStore.getState().revision;
    flushPendingAppearance().then(async (flushed) => {
      if (!flushed) return;
      const preferences = await loadServerAppearance();
      if (!preferences) return;
      if (useAppearanceStore.getState().revision !== revision) return;
      await commitAppearance(preferences);
    });
  }, [IsAuthenticated, Session?.User.UsrID, commitAppearance]);

  if (!IsReady) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator />
        <Text variant="muted">Cargando sesión...</Text>
      </View>
    );
  }

  if ((!IsAuthenticated && pathname !== '/login') || (IsAuthenticated && pathname === '/login')) {
    return <View className="flex-1 bg-background" />;
  }

  return children;
}
