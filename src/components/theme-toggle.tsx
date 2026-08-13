import { LoaderCircle, Moon, Sun } from 'lucide-react-native';
import * as React from 'react';
import { useColorScheme } from 'nativewind';

import { Button } from '@/components/ui/button';
import { saveOrQueueAppearance, useAppearanceStore } from '@/theme/appearance';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const preferences = useAppearanceStore((state) => state.preferences);
  const previewChanges = useAppearanceStore((state) => state.previewChanges);
  const commit = useAppearanceStore((state) => state.commit);
  const [saving, setSaving] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setColorScheme(next);
    const nextPreferences = { ...preferences, Theme: next };
    previewChanges(nextPreferences);
    void commit(nextPreferences);
    if (timeout.current) clearTimeout(timeout.current);
    setSaving(true);
    timeout.current = setTimeout(async () => {
      await saveOrQueueAppearance(nextPreferences);
      setSaving(false);
      timeout.current = null;
    }, 1500);
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onPress={toggle} accessibilityLabel={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}>
      {saving ? <LoaderCircle size={17} className="animate-spin text-foreground" /> : isDark ? <Sun size={17} className="text-foreground" /> : <Moon size={17} className="text-foreground" />}
    </Button>
  );
}
