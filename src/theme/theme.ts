import { storage } from '@/lib/storage';

export type NovaTheme = 'light' | 'dark';

const THEME_KEY = 'nova.theme';

export async function getStoredTheme(): Promise<NovaTheme | null> {
  const value = await storage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export async function storeTheme(theme: NovaTheme): Promise<void> {
  await storage.setItem(THEME_KEY, theme);
}
