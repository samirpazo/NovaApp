import type { Href } from 'expo-router';

export const restaurantRoutes = {
  RST_BRANCH: '/branches',
  RST_TABLE: '/tables',
} satisfies Record<string, Href>;
