import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react-native';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useAuthStore } from '@/auth';
import { FormNText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

const loginSchema = z.object({
  User: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres.'),
  Password: z
    .string()
    .min(4, 'La contraseña debe tener al menos 4 caracteres.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, IsLoading, Error } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { User: '', Password: '' },
  });

  const submit = handleSubmit(async ({ User, Password }) => {
    try {
      await signIn(User, Password);
      router.replace('/');
    } catch {
      // The authentication store renders the normalized error.
    }
  });

  return (
    <View className="flex-1 bg-black">
      <Image
        source={require('@/assets/images/bg-nova.webp')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        className="absolute inset-0 z-0 bg-neutral-800/60 web:backdrop-blur-[2px]"
      />
      <SafeAreaView className="relative z-10 flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerClassName="relative min-h-full items-center justify-center px-4 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-8 flex-row items-center gap-3 md:hidden">
              <Image
                source={require('@/assets/images/logo-nova.svg')}
                style={{ width: 40, height: 40 }}
                contentFit="contain"
              />
              <Text className="font-poppins-bold text-3xl text-neutral-100">
                NOVA
              </Text>
            </View>
            <View className="absolute left-8 top-8 hidden flex-row items-center gap-3 md:flex">
              <Image
                source={require('@/assets/images/logo-nova_b.svg')}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
              />
              <Text className="font-poppins-bold text-2xl text-neutral-100">
                NOVA
              </Text>
            </View>

            <Card className="w-full max-w-[440px] rounded-[40px] border-white/60 bg-neutral-100/80 p-8 shadow-2xl web:backdrop-blur-2xl md:p-10">
              <View className="mb-10 items-center gap-2">
                <Text className="font-poppins-semibold text-[28px] text-neutral-800">
                  Bienvenido
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="max-w-[300px] text-center text-sm font-medium text-neutral-500"
                >
                  Toma el control total de tus operaciones.
                </Text>
              </View>

              <View className="gap-4">
                <FormNText
                  control={control}
                  name="User"
                  label="Usuario"
                  labelClassName="font-poppins-semibold text-xs text-neutral-500"
                  placeholder="Usuario"
                  placeholderTextColor="#a3a3a3"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearable={false}
                  className="h-12 rounded-xl border-neutral-300/50 bg-white/60 px-4 text-sm text-neutral-800"
                />
                <FormNText
                  control={control}
                  name="Password"
                  label="Contraseña"
                  labelClassName="font-poppins-semibold text-xs text-neutral-500"
                  placeholder="••••••••"
                  placeholderTextColor="#a3a3a3"
                  secureTextEntry={!showPassword}
                  clearable={false}
                  className="h-12 rounded-xl border-neutral-300/50 bg-white/60 px-4 text-sm text-neutral-800"
                  suffix={
                    <Pressable
                      accessibilityLabel={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      className="h-10 w-10 items-center justify-center"
                      onPress={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff
                          size={19}
                          className="text-neutral-400"
                        />
                      ) : (
                        <Eye
                          size={19}
                          className="text-neutral-400"
                        />
                      )}
                    </Pressable>
                  }
                />

                {Error ? (
                  <View className="flex-row items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <ShieldAlert
                      size={18}
                      className="mt-0.5 text-destructive"
                    />
                    <Text
                      className="min-w-0 flex-1 text-sm text-destructive"
                      role="alert"
                    >
                      {Error}
                    </Text>
                  </View>
                ) : null}

                <Pressable className="items-end pb-2 pt-1">
                  <Text className="text-xs font-medium text-neutral-500">
                    ¿Olvidaste tu contraseña?
                  </Text>
                </Pressable>

                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-neutral-900"
                  disabled={IsLoading}
                  onPress={submit}
                >
                  <LogIn
                    size={18}
                    color="white"
                  />
                  <Text className="font-poppins-semibold text-sm text-white">
                    {IsLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
                  </Text>
                </Button>
              </View>

              <View className="mt-8 items-center gap-1 border-t border-neutral-200/50 pt-6">
                <Text className="text-xs font-medium text-neutral-500">
                  © 2026 Nova System
                </Text>
                <Text className="text-[11px] text-neutral-400">
                  Gestión inteligente y segura.
                </Text>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
