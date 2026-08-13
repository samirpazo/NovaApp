import { createResponseApiSchema } from '@/contracts/api';
import { api, getApiErrorMessage } from '@/lib/api';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { create } from 'zustand';

export const NOVA_COLORS = ['#002aff', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#e11d48'] as const;

export const AppearancePreferencesSchema = z.object({
  Theme: z.string().nullish(),
  PrimaryColor: z.string().nullish(),
  HeaderColor: z.string().nullish(),
  SidebarColor: z.string().nullish(),
}).passthrough();

export type AppearancePreferences = z.infer<typeof AppearancePreferencesSchema>;

const STORAGE_KEY = 'nova.appearance';
const PENDING_STORAGE_KEY = 'nova.appearance.pending';
const DEFAULTS: Required<Pick<AppearancePreferences, 'Theme' | 'PrimaryColor' | 'HeaderColor'>> = {
  Theme: 'light',
  PrimaryColor: '#002aff',
  HeaderColor: '#002aff',
};

interface AppearanceState {
  preferences: AppearancePreferences;
  preview: AppearancePreferences;
  revision: number;
  ready: boolean;
  hydrate: () => Promise<void>;
  previewChanges: (preferences: AppearancePreferences) => void;
  discardPreview: () => void;
  commit: (preferences: AppearancePreferences) => Promise<void>;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  preferences: DEFAULTS,
  preview: DEFAULTS,
  revision: 0,
  ready: false,
  hydrate: async () => {
    const raw = await storage.getItem(STORAGE_KEY);
    let parsed: ReturnType<typeof AppearancePreferencesSchema.safeParse> | null = null;
    try {
      parsed = raw ? AppearancePreferencesSchema.safeParse(JSON.parse(raw)) : null;
    } catch {
      parsed = null;
    }
    const preferences = parsed?.success ? { ...DEFAULTS, ...parsed.data } : DEFAULTS;
    set({ preferences, preview: preferences, ready: true });
  },
  previewChanges: (preferences) => set((state) => ({ preview: { ...state.preview, ...preferences }, revision: state.revision + 1 })),
  discardPreview: () => set((state) => ({ preview: state.preferences })),
  commit: async (preferences) => {
    const next = { ...DEFAULTS, ...preferences };
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    set((state) => ({ preferences: next, preview: next, revision: state.revision + 1 }));
  },
}));

export async function loadServerAppearance(): Promise<AppearancePreferences | null> {
  try {
    const response = await api.get('/SecUserPreference/MyPreferences');
    return createResponseApiSchema(AppearancePreferencesSchema.nullish()).parse(response.data).Data ?? null;
  } catch {
    return null;
  }
}

export async function saveServerAppearance(preferences: AppearancePreferences): Promise<AppearancePreferences> {
  try {
    const response = await api.post('/SecUserPreference/Save', preferences);
    return createResponseApiSchema(AppearancePreferencesSchema).parse(response.data).Data ?? preferences;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
}

export async function queueAppearanceSync(preferences: AppearancePreferences): Promise<void> {
  await storage.setItem(PENDING_STORAGE_KEY, JSON.stringify(preferences));
}

export async function saveOrQueueAppearance(preferences: AppearancePreferences): Promise<'synced' | 'pending'> {
  try {
    await saveServerAppearance(preferences);
    await storage.removeItem(PENDING_STORAGE_KEY);
    return 'synced';
  } catch {
    await queueAppearanceSync(preferences);
    return 'pending';
  }
}

export async function flushPendingAppearance(): Promise<boolean> {
  const raw = await storage.getItem(PENDING_STORAGE_KEY);
  if (!raw) return true;
  try {
    const parsed = AppearancePreferencesSchema.parse(JSON.parse(raw));
    await saveServerAppearance(parsed);
    await storage.removeItem(PENDING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hexToHslChannels(hex: string): string {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#002aff';
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(safe.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}
