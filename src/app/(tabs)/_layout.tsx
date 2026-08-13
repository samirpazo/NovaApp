import { AppHeader } from '@/components/layout/AppHeader';
import { useSyncIndicators } from '@/sync/useSyncIndicators';
import { Tabs } from 'expo-router';
import {
  CircleUserRound,
  GitCompareArrows,
  Home,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useWindowDimensions } from 'react-native';

const icon = (Icon: typeof Home) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Icon color={color} size={size} strokeWidth={2} />;
  };

const badge = (count: number) => (count > 99 ? '99+' : count || undefined);

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const { width } = useWindowDimensions();
  const dark = colorScheme === 'dark';
  const horizontalGutter = width < 768 ? 16 : 24;
  const { conflicts, pendingChanges } = useSyncIndicators();

  return (
    <Tabs
      screenOptions={{
        header: () => (
          <AppHeader pendingChanges={pendingChanges} sceneGutter={horizontalGutter} />
        ),
        sceneStyle: {
          backgroundColor: dark ? '#0a0a0a' : '#ffffff',
          paddingHorizontal: horizontalGutter,
        },
        tabBarActiveTintColor: dark ? '#f4f4f5' : '#18181b',
        tabBarInactiveTintColor: dark ? '#71717a' : '#71717a',
        tabBarStyle: {
          backgroundColor: dark ? '#0a0a0a' : '#ffffff',
          borderTopColor: dark ? '#27272a' : '#e4e4e7',
          height: 60,
          paddingTop: 5,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 10,
          letterSpacing: 0,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon(Home) }} />
      <Tabs.Screen name="modules" options={{ title: 'Módulos', tabBarIcon: icon(LayoutGrid) }} />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sincronizar',
          tabBarBadge: badge(pendingChanges),
          tabBarBadgeStyle: {
            backgroundColor: '#f59e0b',
            color: '#18181b',
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 8,
          },
          tabBarIcon: icon(RefreshCw),
        }}
      />
      <Tabs.Screen
        name="conflicts"
        options={{
          title: 'Conflictos',
          tabBarBadge: badge(conflicts),
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 8,
          },
          tabBarIcon: icon(GitCompareArrows),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon(CircleUserRound) }} />
      <Tabs.Screen name="appearance" options={{ href: null }} />
      <Tabs.Screen name="branches" options={{ href: null }} />
      <Tabs.Screen name="conflict-resolution" options={{ href: null }} />
      <Tabs.Screen name="definition-details" options={{ href: null }} />
      <Tabs.Screen name="definitions" options={{ href: null }} />
      <Tabs.Screen name="sync-details" options={{ href: null }} />
      <Tabs.Screen name="tables" options={{ href: null }} />
    </Tabs>
  );
}
