import type { Href } from 'expo-router';

import { generalRoutes } from '@/lib/routes/general';
import { restaurantRoutes } from '@/lib/routes/restaurant';

export const ROUTE_MAP = {
  ...generalRoutes,
  ...restaurantRoutes,
} satisfies Record<string, Href>;

export const STATIC_PAGES = [
  { id: 'HOME', path: '/(tabs)', title: 'Inicio', icon: 'home' },
  {
    id: 'MODULES',
    path: '/(tabs)/modules',
    title: 'Módulos',
    icon: 'layout-grid',
  },
  {
    id: 'SYNC',
    path: '/(tabs)/sync',
    title: 'Sincronización',
    icon: 'refresh-cw',
  },
  {
    id: 'CONFLICTS',
    path: '/(tabs)/conflicts',
    title: 'Conflictos',
    icon: 'git-compare-arrows',
  },
  {
    id: 'PROFILE',
    path: '/(tabs)/profile',
    title: 'Perfil',
    icon: 'circle-user-round',
  },
  {
    id: 'APPEARANCE',
    path: '/appearance',
    title: 'Apariencia',
    icon: 'palette',
  },
] as const satisfies readonly {
  id: string;
  path: Href;
  title: string;
  icon: string;
}[];

export function getRouteByCode(
  optCode: string | null | undefined,
): Href | null {
  if (!optCode) return null;
  return (
    ROUTE_MAP[optCode.trim().toUpperCase() as keyof typeof ROUTE_MAP] ?? null
  );
}

export function normalizePathname(pathname: string): string {
  return pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

export function getCodeByRoute(pathname: string): string | null {
  const normalizedPath = normalizePathname(pathname);
  const entry = Object.entries(ROUTE_MAP).find(
    ([, route]) => normalizePathname(String(route)) === normalizedPath,
  );
  return entry?.[0] ?? null;
}
