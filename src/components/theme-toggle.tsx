import { LoaderCircle, Monitor, Moon, Sun } from 'lucide-react-native';
import * as React from 'react';

import { useAuthStore } from '@/auth/store';
import { NButton } from '@/components/forms/NButton';
import {
  getNextThemeMode,
  resolveThemeMode,
  saveOrQueueAppearance,
  useAppearanceStore,
} from '@/theme/appearance';

export function ThemeToggle({
  darkForeground = false,
}: {
  darkForeground?: boolean;
}) {
  const preferences = useAppearanceStore((state) => state.preferences);
  const previewChanges = useAppearanceStore((state) => state.previewChanges);
  const commit = useAppearanceStore((state) => state.commit);
  const [saving, setSaving] = React.useState(false);
  const currentTheme = resolveThemeMode(preferences.Theme);
  const nextTheme = getNextThemeMode(preferences.Theme);
  const nextLabel =
    nextTheme === 'light'
      ? 'claro'
      : nextTheme === 'dark'
        ? 'oscuro'
        : 'del sistema';
  const foregroundClass = darkForeground ? 'text-zinc-950' : 'text-white';

  const toggle = async () => {
    const userId = useAuthStore.getState().Session?.User.UsrID;
    const nextPreferences = { ...preferences, Theme: nextTheme };
    previewChanges(nextPreferences);
    setSaving(true);
    try {
      await commit(nextPreferences);
      await saveOrQueueAppearance(nextPreferences, userId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <NButton
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${darkForeground ? 'active:bg-black/10' : 'active:bg-white/15'}`}
      disabled={saving}
      onPress={() => void toggle()}
      accessibilityLabel={`Cambiar tema a ${nextLabel}`}
    >
      {saving ? (
        <LoaderCircle
          size={17}
          className={`animate-spin ${foregroundClass}`}
        />
      ) : currentTheme === 'light' ? (
        <Sun
          size={17}
          className={foregroundClass}
        />
      ) : currentTheme === 'dark' ? (
        <Moon
          size={17}
          className={foregroundClass}
        />
      ) : (
        <Monitor
          size={17}
          className={foregroundClass}
        />
      )}
    </NButton>
  );
}
