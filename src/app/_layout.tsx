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
import { AuthGate } from '@/auth';
import { getStoredTheme } from '@/theme/theme';
import { hexToHslChannels, useAppearanceStore } from '@/theme/appearance';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  const { colorScheme, setColorScheme } = useColorScheme();
  const appearance = useAppearanceStore((state) => state.preview);
  const appearanceReady = useAppearanceStore((state) => state.ready);
  const hydrateAppearance = useAppearanceStore((state) => state.hydrate);
  const isDark = colorScheme === 'dark';

  React.useEffect(() => {
    void hydrateAppearance();
  }, [hydrateAppearance]);

  React.useEffect(() => {
    if (appearanceReady) {
      setColorScheme(appearance.Theme === 'light' ? 'light' : 'dark');
      return;
    }
    getStoredTheme().then((theme) => theme && setColorScheme(theme));
  }, [appearance.Theme, appearanceReady, setColorScheme]);

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
