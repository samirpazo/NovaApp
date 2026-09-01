import '@/global.css';

import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, vars } from 'nativewind';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthGate } from '@/auth';
import { hexToHslChannels, resolveThemeMode, useAppearanceStore } from '@/theme/appearance';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  const { colorScheme, setColorScheme } = useColorScheme();
  const appearance = useAppearanceStore((state) => state.preview);
  const appearanceReady = useAppearanceStore((state) => state.ready);
  const hydrateAppearance = useAppearanceStore((state) => state.hydrate);
  const isDark = colorScheme === 'dark';
  const setColorSchemeRef = React.useRef(setColorScheme);

  setColorSchemeRef.current = setColorScheme;

  React.useEffect(() => {
    void hydrateAppearance();
  }, [hydrateAppearance]);

  React.useEffect(() => {
    if (!appearanceReady) return;
    const themeMode = resolveThemeMode(appearance.Theme);
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
  }, [appearance.Theme, appearanceReady]);

  if (!fontsLoaded || !appearanceReady) return null;

  return (
    <GestureHandlerRootView
      className="flex-1 bg-background"
      style={[
        { flex: 1 },
        vars({
          '--primary': hexToHslChannels(appearance.PrimaryColor || '#002aff'),
          '--ring': hexToHslChannels(appearance.PrimaryColor || '#002aff'),
          '--primary-selection': `${hexToHslChannels(appearance.PrimaryColor || '#002aff')} / 15%`,
        }),
      ]}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
        <PortalHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
