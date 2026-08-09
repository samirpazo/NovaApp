import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react-native';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useAuthStore } from '@/auth';
import { FormNText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

const loginSchema = z.object({
  User: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres.'),
  Password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres.'),
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
    <ImageBackground
      source={require('@/assets/images/bg-nova.webp')}
      className="flex-1"
      resizeMode="cover"
      style={{ width: '100%' }}>
      <View className="absolute inset-0 bg-black/60" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerClassName="min-h-full items-center justify-center px-4 py-8" keyboardShouldPersistTaps="handled">
            <View className="mb-6 flex-row items-center gap-3">
              <Image source={require('@/assets/images/logo-nova.svg')} style={{ width: 42, height: 42 }} contentFit="contain" />
              <Text className="text-3xl font-bold text-white">NOVA</Text>
            </View>

            <Card className="w-full max-w-md border-white/40 bg-card/95 p-6 web:p-8">
              <View className="mb-6 items-center gap-1">
                <Text variant="title">Bienvenido</Text>
                <Text variant="muted">Ingresa a tu espacio de trabajo</Text>
              </View>

              <View className="gap-4">
                <FormNText control={control} name="User" label="Usuario" placeholder="Usuario" autoCapitalize="none" autoCorrect={false} required />
                <FormNText
                  control={control}
                  name="Password"
                  label="Contraseña"
                  placeholder="Contraseña"
                  secureTextEntry={!showPassword}
                  required
                  suffix={
                    <Pressable accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="h-10 w-10 items-center justify-center" onPress={() => setShowPassword((current) => !current)}>
                      {showPassword ? <EyeOff size={19} className="text-muted-foreground" /> : <Eye size={19} className="text-muted-foreground" />}
                    </Pressable>
                  }
                />

                {Error ? (
                  <View className="flex-row items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <ShieldAlert size={18} className="mt-0.5 text-destructive" />
                    <Text className="min-w-0 flex-1 text-sm text-destructive" role="alert">{Error}</Text>
                  </View>
                ) : null}

                <Button size="lg" disabled={IsLoading} onPress={submit}>
                  <LogIn size={18} className="text-primary-foreground" />
                  <Text>{IsLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}</Text>
                </Button>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
