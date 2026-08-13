import { LoaderCircle, Moon, Sun } from 'lucide-react-native';
import * as React from 'react';
import { useColorScheme } from 'nativewind';

import { Button } from '@/components/ui/button';
import { saveOrQueueAppearance, useAppearanceStore } from '@/theme/appearance';

export function ThemeToggle() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const preferences = useAppearanceStore((state) => state.preferences);
  const previewChanges = useAppearanceStore((state) => state.previewChanges);
  const commit = useAppearanceStore((state) => state.commit);
  const [saving, setSaving] = React.useState(false);

  const toggle = async () => {
    const next = isDark ? 'light' : 'dark';
    const nextPreferences = { ...preferences, Theme: next };
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
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={saving} onPress={() => void toggle()} accessibilityLabel={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}>
      {saving ? <LoaderCircle size={17} className="animate-spin text-foreground" /> : isDark ? <Sun size={17} className="text-foreground" /> : <Moon size={17} className="text-foreground" />}
    </Button>
  );
}
