import '@/global.css';

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, vars } from 'nativewind';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthGate } from '@/auth';
import { useAuthStore } from '@/auth/store';
import {
  hexToHslChannels,
  headerUsesDarkForeground,
  resolveThemeMode,
  useAppearanceStore,
} from '@/theme/appearance';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const { colorScheme, setColorScheme } = useColorScheme();
  const appearance = useAppearanceStore((state) => state.preview);
  const appearanceUserId = useAppearanceStore((state) => state.userId);
  const sessionUserId = useAuthStore((state) => state.Session?.User.UsrID ?? null);
  const appearanceReady = useAppearanceStore((state) => state.ready);
  const hydrateAppearance = useAppearanceStore((state) => state.hydrate);
  const safeAppearance =
    appearanceUserId === sessionUserId
      ? appearance
      : { Theme: 'system' as const, PrimaryColor: '#002aff', HeaderColor: '#002aff' };
  const isDark = colorScheme === 'dark';
  const setColorSchemeRef = React.useRef(setColorScheme);

  setColorSchemeRef.current = setColorScheme;

  React.useEffect(() => {
    void hydrateAppearance();
  }, [hydrateAppearance]);

  React.useEffect(() => {
    if (!appearanceReady) return;
    const themeMode = resolveThemeMode(safeAppearance.Theme);
    if (Platform.OS !== 'web' || themeMode !== 'system') {
      setColorSchemeRef.current(themeMode);
      return;
    }

    setColorSchemeRef.current('system');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemClass = () => {
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
    };
    syncSystemClass();
    mediaQuery.addEventListener('change', syncSystemClass);
    return () => mediaQuery.removeEventListener('change', syncSystemClass);
  }, [safeAppearance.Theme, appearanceReady]);

  if (!fontsLoaded || !appearanceReady) return null;

  return (
    <GestureHandlerRootView
      className="flex-1 bg-background"
      style={[
        { flex: 1 },
        vars({
          '--primary': hexToHslChannels(safeAppearance.PrimaryColor || '#002aff'),
          '--ring': hexToHslChannels(safeAppearance.PrimaryColor || '#002aff'),
          '--primary-selection': `${hexToHslChannels(safeAppearance.PrimaryColor || '#002aff')} / 15%`,
        }),
      ]}
    >
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar
          style={
            headerUsesDarkForeground(safeAppearance.HeaderColor || '#002aff')
              ? 'dark'
              : 'light'
          }
        />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
