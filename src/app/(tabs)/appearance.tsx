import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  Monitor,
  Moon,
  Palette,
  Save,
  SlidersHorizontal,
  Sun,
} from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NButton } from '@/components/forms/NButton';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  NOVA_COLORS,
  resolveThemeMode,
  saveOrQueueAppearance,
  type ThemeMode,
  useAppearanceStore,
} from '@/theme/appearance';

export default function AppearanceScreen() {
  const router = useRouter();
  const stored = useAppearanceStore((state) => state.preferences);
  const previewChanges = useAppearanceStore((state) => state.previewChanges);
  const discardPreview = useAppearanceStore((state) => state.discardPreview);
  const commit = useAppearanceStore((state) => state.commit);
  const [theme, setTheme] = React.useState<ThemeMode>(() =>
    resolveThemeMode(stored.Theme),
  );
  const [primaryColor, setPrimaryColor] = React.useState(
    stored.PrimaryColor || '#002aff',
  );
  const [headerColor, setHeaderColor] = React.useState(
    stored.HeaderColor || '#002aff',
  );
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const messageTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isLeavingRef = React.useRef(false);

  React.useEffect(() => {
    if (isLeavingRef.current) return;
    previewChanges({
      ...stored,
      Theme: theme,
      PrimaryColor: primaryColor,
      HeaderColor: headerColor,
    });
  }, [headerColor, previewChanges, primaryColor, stored, theme]);

  useFocusEffect(
    React.useCallback(() => {
      const preferences = useAppearanceStore.getState().preferences;
      isLeavingRef.current = false;
      setTheme(resolveThemeMode(preferences.Theme));
      setPrimaryColor(preferences.PrimaryColor || '#002aff');
      setHeaderColor(preferences.HeaderColor || '#002aff');

      return () => {
        isLeavingRef.current = true;
        discardPreview();
      };
    }, [discardPreview]),
  );

  const cancel = () => {
    isLeavingRef.current = true;
    discardPreview();
    router.replace('/(tabs)/profile');
  };

  const chooseTheme = (value: ThemeMode) => {
    setTheme(value);
    previewChanges({
      ...stored,
      Theme: value,
      PrimaryColor: primaryColor,
      HeaderColor: headerColor,
    });
  };

  const save = async () => {
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    setSaving(true);
    setMessage(null);
    const next = {
      ...stored,
      Theme: theme,
      PrimaryColor: primaryColor,
      HeaderColor: headerColor,
    };
    try {
      await commit(next);
      const status = await saveOrQueueAppearance(next);
      setMessage({
        text:
          status === 'synced'
            ? 'Preferencias guardadas y sincronizadas.'
            : 'Preferencias guardadas en este dispositivo; pendientes de sincronización.',
        error: false,
      });
      messageTimeout.current = setTimeout(() => setMessage(null), 3500);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : 'No se pudieron guardar las preferencias.',
        error: true,
      });
      messageTimeout.current = setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(
    () => () => {
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
    },
    [],
  );

  const ColorChoices = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (color: string) => void;
  }) => (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-3">
        {NOVA_COLORS.map((color) => (
          <Pressable
            key={color}
            accessibilityLabel={`Usar color ${color}`}
            onPress={() => onChange(color)}
            style={{ backgroundColor: color }}
            className="h-10 w-10 items-center justify-center rounded-md"
          >
            {value.toLowerCase() === color ? (
              <Check
                size={18}
                color="white"
              />
            ) : null}
          </Pressable>
        ))}
      </View>
      <Input
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        className="h-9 text-xs"
        placeholder="#002aff"
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-5xl gap-4 pb-20 pt-3">
        <View className="flex-row items-center gap-2">
          <NButton
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onPress={cancel}
            accessibilityLabel="Volver a perfil"
          >
            <ArrowLeft
              size={17}
              className="text-foreground"
            />
          </NButton>
          <View>
            <Text className="font-poppins-semibold text-lg">
              Personalización
            </Text>
            <Text className="text-xs text-muted-foreground">
              Apariencia de Nova en este dispositivo
            </Text>
          </View>
        </View>
        <View className="gap-4 md:flex-row">
          <View className="flex-1 gap-4 rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <SlidersHorizontal
                size={18}
                className="text-primary"
              />
              <View>
                <Text className="font-poppins-semibold">Tema</Text>
                <Text className="text-xs text-muted-foreground">
                  Sistema sigue la apariencia de tu dispositivo.
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: theme === mode }}
                  accessibilityLabel={`Usar tema ${mode === 'light' ? 'claro' : mode === 'dark' ? 'oscuro' : 'del sistema'}`}
                  onPress={() => chooseTheme(mode)}
                  className={`h-24 flex-1 justify-between rounded-md border p-3 ${theme === mode ? 'border-primary bg-primary-selection' : 'border-border bg-muted/30'}`}
                >
                  {mode === 'light' ? (
                    <Sun
                      size={18}
                      className="text-foreground"
                    />
                  ) : mode === 'dark' ? (
                    <Moon
                      size={18}
                      className="text-foreground"
                    />
                  ) : (
                    <Monitor
                      size={18}
                      className="text-foreground"
                    />
                  )}
                  <Text className="font-poppins-bold text-xs uppercase tracking-[1.5px]">
                    {mode === 'light'
                      ? 'Claro'
                      : mode === 'dark'
                        ? 'Oscuro'
                        : 'Sistema'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-1 gap-4 rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <Palette
                size={18}
                className="text-primary"
              />
              <View>
                <Text className="font-poppins-semibold">Identidad visual</Text>
                <Text className="text-xs text-muted-foreground">
                  Color de acento del sistema
                </Text>
              </View>
            </View>
            <ColorChoices
              value={primaryColor}
              onChange={setPrimaryColor}
            />
          </View>
        </View>
        <View className="gap-4 rounded-lg border border-border bg-card p-4">
          <View>
            <Text className="font-poppins-semibold">
              Personalización de cabecera
            </Text>
            <Text className="text-xs text-muted-foreground">
              Color reservado para barras superiores y navegación.
            </Text>
          </View>
          <ColorChoices
            value={headerColor}
            onChange={setHeaderColor}
          />
        </View>
        <View className="items-end">
          <NButton
            onPress={save}
            disabled={saving}
          >
            <Save
              size={16}
              className="text-primary-foreground"
            />
            <Text>{saving ? 'Guardando...' : 'Guardar preferencias'}</Text>
          </NButton>
        </View>
      </ScrollView>
      {message ? (
        <View
          pointerEvents="none"
          accessibilityRole={message.error ? 'alert' : 'none'}
          accessibilityLiveRegion={message.error ? 'assertive' : 'polite'}
          className={`absolute left-4 right-4 top-3 z-50 mx-auto max-w-5xl flex-row items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-lg ${message.error ? 'border-destructive/50' : 'border-success/50'}`}
        >
          {message.error ? (
            <CircleAlert
              size={18}
              className="text-destructive"
            />
          ) : (
            <CircleCheck
              size={18}
              className="text-success"
            />
          )}
          <Text
            className={`flex-1 text-sm ${message.error ? 'text-destructive' : 'text-foreground'}`}
          >
            {message.text}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
