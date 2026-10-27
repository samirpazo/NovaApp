import { createResponseApiSchema } from '@/contracts/api';
import { getForUser, getApiErrorMessage, postForUser } from '@/lib/api';
import { storage } from '@/lib/storage';
import { getActiveIdentityKey } from '@/database';
import { z } from 'zod';
import { create } from 'zustand';

export const NOVA_COLORS = [
  '#002aff',
  '#06b6d4',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#e11d48',
] as const;

export const ThemeModeSchema = z.enum(['light', 'dark', 'system']);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const AppearancePreferencesSchema = z
  .object({
    Theme: ThemeModeSchema.nullish(),
    PrimaryColor: z.string().nullish(),
    HeaderColor: z.string().nullish(),
    SidebarColor: z.string().nullish(),
  })
  .passthrough();

export type AppearancePreferences = z.infer<typeof AppearancePreferencesSchema>;

const STORAGE_KEY = 'nova.appearance';
const PENDING_STORAGE_KEY = 'nova.appearance.pending';
const userStorageKey = (key: string, identityKey: string | null) =>
  identityKey ? `${key}.account.${identityKey}` : key;
let hydrateGeneration = 0;
const appearanceSaveQueues = new Map<string, Promise<void>>();
const DEFAULTS: Required<
  Pick<AppearancePreferences, 'Theme' | 'PrimaryColor' | 'HeaderColor'>
> = {
  Theme: 'system',
  PrimaryColor: '#002aff',
  HeaderColor: '#002aff',
};

export function resolveThemeMode(value: unknown): ThemeMode {
  const parsed = ThemeModeSchema.safeParse(value);
  return parsed.success ? parsed.data : 'system';
}

export function getNextThemeMode(value: unknown): ThemeMode {
  const current = resolveThemeMode(value);
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light';
}

function normalizeAppearance(
  preferences: AppearancePreferences | null | undefined,
): AppearancePreferences {
  return {
    ...DEFAULTS,
    ...preferences,
    Theme: resolveThemeMode(preferences?.Theme),
  };
}

interface AppearanceState {
  preferences: AppearancePreferences;
  preview: AppearancePreferences;
  userId: number | null;
  identityKey: string | null;
  revision: number;
  ready: boolean;
  hydrate: (userId?: number | null, identityKey?: string | null) => Promise<void>;
  previewChanges: (preferences: AppearancePreferences) => void;
  discardPreview: () => void;
  commit: (preferences: AppearancePreferences) => Promise<void>;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  preferences: DEFAULTS,
  preview: DEFAULTS,
  userId: null,
  identityKey: null,
  revision: 0,
  ready: false,
  hydrate: async (userId = null, identityKey = null) => {
    const generation = ++hydrateGeneration;
    const raw = userId
      ? await storage.getItem(userStorageKey(STORAGE_KEY, identityKey))
      : null;
    let parsed: ReturnType<
      typeof AppearancePreferencesSchema.safeParse
    > | null = null;
    try {
      parsed = raw
        ? AppearancePreferencesSchema.safeParse(JSON.parse(raw))
        : null;
    } catch {
      parsed = null;
    }
    const preferences = parsed?.success
      ? normalizeAppearance(parsed.data)
      : DEFAULTS;
    if (generation === hydrateGeneration)
      set({ preferences, preview: preferences, userId, identityKey, ready: true });
  },
  previewChanges: (preferences) =>
    set((state) => ({
      preview: { ...state.preview, ...preferences },
      revision: state.revision + 1,
    })),
  discardPreview: () => set((state) => ({ preview: state.preferences })),
  commit: async (preferences) => {
    const next = normalizeAppearance(preferences);
    const userId = useAppearanceStore.getState().userId;
    const identityKey = useAppearanceStore.getState().identityKey;
    if (!userId)
      throw new Error('No se pueden guardar preferencias sin una sesión activa.');
    await storage.setItem(
      userStorageKey(STORAGE_KEY, identityKey),
      JSON.stringify(next),
    );
    set((state) =>
      state.userId === userId && state.identityKey === identityKey
        ? {
            preferences: next,
            preview: next,
            revision: state.revision + 1,
          }
        : state,
    );
  },
}));

export async function loadServerAppearance(
  userId: number,
  identityKey = getActiveIdentityKey() ?? undefined,
): Promise<AppearancePreferences | null> {
  try {
    const response = await getForUser(
      '/SecUserPreference/MyPreferences',
      userId,
      {},
      identityKey,
    );
    return (
      createResponseApiSchema(AppearancePreferencesSchema.nullish()).parse(
        response.data,
      ).Data ?? null
    );
  } catch {
    return null;
  }
}

export async function saveServerAppearance(
  preferences: AppearancePreferences,
  userId: number,
  identityKey = getActiveIdentityKey() ?? undefined,
): Promise<AppearancePreferences> {
  try {
    const response = await postForUser(
      '/SecUserPreference/Save',
      preferences,
      userId,
      {},
      identityKey,
    );
    return (
      createResponseApiSchema(AppearancePreferencesSchema).parse(response.data)
        .Data ?? preferences
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
}

function saveServerAppearanceInOrder(
  preferences: AppearancePreferences,
  userId: number,
  identityKey: string,
): Promise<AppearancePreferences> {
  const previous = appearanceSaveQueues.get(identityKey) ?? Promise.resolve();
  const save = previous
    .catch(() => undefined)
    .then(() => saveServerAppearance(preferences, userId, identityKey));
  const tail = save.then(
    () => undefined,
    () => undefined,
  );
  appearanceSaveQueues.set(identityKey, tail);
  void tail.then(() => {
    if (appearanceSaveQueues.get(identityKey) === tail)
      appearanceSaveQueues.delete(identityKey);
  });
  return save;
}

export async function queueAppearanceSync(
  preferences: AppearancePreferences,
  userId = useAppearanceStore.getState().userId,
  identityKey = useAppearanceStore.getState().identityKey,
): Promise<void> {
  if (!userId || !identityKey)
    throw new Error('No se pueden encolar preferencias sin una sesión activa.');
  await storage.setItem(
    userStorageKey(PENDING_STORAGE_KEY, identityKey),
    JSON.stringify(preferences),
  );
}

export async function saveOrQueueAppearance(
  preferences: AppearancePreferences,
  userId = useAppearanceStore.getState().userId,
  identityKey = useAppearanceStore.getState().identityKey,
): Promise<'synced' | 'pending'> {
  if (!userId || !identityKey)
    throw new Error('No se pueden sincronizar preferencias sin una sesión activa.');
  const queueKey = userStorageKey(PENDING_STORAGE_KEY, identityKey);
  const queued = JSON.stringify(preferences);
  await storage.setItem(queueKey, queued);
  if (
    useAppearanceStore.getState().userId !== userId ||
    useAppearanceStore.getState().identityKey !== identityKey
  ) return 'pending';
  try {
    await saveServerAppearanceInOrder(preferences, userId, identityKey);
    if (
      useAppearanceStore.getState().userId !== userId ||
      useAppearanceStore.getState().identityKey !== identityKey
    ) return 'pending';
    if ((await storage.getItem(queueKey)) === queued)
      await storage.removeItem(queueKey);
    return 'synced';
  } catch {
    return 'pending';
  }
}

export async function flushPendingAppearance(
  userId = useAppearanceStore.getState().userId,
  identityKey = useAppearanceStore.getState().identityKey,
): Promise<boolean> {
  if (
    !userId || !identityKey ||
    useAppearanceStore.getState().userId !== userId ||
    useAppearanceStore.getState().identityKey !== identityKey
  ) return false;
  const queueKey = userStorageKey(PENDING_STORAGE_KEY, identityKey);
  const raw = await storage.getItem(queueKey);
  if (!raw) return true;
  if (
    useAppearanceStore.getState().userId !== userId ||
    useAppearanceStore.getState().identityKey !== identityKey
  ) return false;
  try {
    const parsed = AppearancePreferencesSchema.parse(JSON.parse(raw));
    await saveServerAppearanceInOrder(parsed, userId, identityKey);
    if (
      useAppearanceStore.getState().userId !== userId ||
      useAppearanceStore.getState().identityKey !== identityKey
    ) return false;
    if ((await storage.getItem(queueKey)) === raw)
      await storage.removeItem(queueKey);
    return true;
  } catch {
    return false;
  }
}

export function hexToHslChannels(hex: string): string {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#002aff';
  const [r, g, b] = [1, 3, 5].map(
    (index) => Number.parseInt(safe.slice(index, index + 2), 16) / 255,
  );
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

export function headerUsesDarkForeground(color: string): boolean {
  if (!/^#[\da-f]{6}$/i.test(color)) return false;
  const channels = [1, 3, 5].map(
    (index) => Number.parseInt(color.slice(index, index + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179;
}
