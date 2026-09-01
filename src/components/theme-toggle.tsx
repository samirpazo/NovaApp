import { LoaderCircle, Monitor, Moon, Sun } from 'lucide-react-native';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { getNextThemeMode, resolveThemeMode, saveOrQueueAppearance, useAppearanceStore } from '@/theme/appearance';

export function ThemeToggle() {
  const preferences = useAppearanceStore((state) => state.preferences);
  const previewChanges = useAppearanceStore((state) => state.previewChanges);
  const commit = useAppearanceStore((state) => state.commit);
  const [saving, setSaving] = React.useState(false);
  const currentTheme = resolveThemeMode(preferences.Theme);
  const nextTheme = getNextThemeMode(preferences.Theme);
  const nextLabel = nextTheme === 'light' ? 'claro' : nextTheme === 'dark' ? 'oscuro' : 'del sistema';

  const toggle = async () => {
    const nextPreferences = { ...preferences, Theme: nextTheme };
    previewChanges(nextPreferences);
    setSaving(true);
    try {
      await commit(nextPreferences);
      await saveOrQueueAppearance(nextPreferences);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={saving} onPress={() => void toggle()} accessibilityLabel={`Cambiar tema a ${nextLabel}`}>
      {saving ? <LoaderCircle size={17} className="animate-spin text-foreground" /> : currentTheme === 'light' ? <Sun size={17} className="text-foreground" /> : currentTheme === 'dark' ? <Moon size={17} className="text-foreground" /> : <Monitor size={17} className="text-foreground" />}
    </Button>
  );
}
