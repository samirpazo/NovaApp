import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, Shield } from 'lucide-react-native';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { z } from 'zod';

import { useAuthStore } from '@/auth';
import { FormNText } from '@/components/forms';
import { NButton } from '@/components/forms/NButton';
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

function LoginGraphic() {
  return (
    <Svg
      style={Platform.select({
        web: { filter: 'drop-shadow(14px 24px 16px #11172280)' },
        default: {
          filter: [
            {
              dropShadow: {
                offsetX: 14,
                offsetY: 24,
                standardDeviation: 16,
                color: '#11172280',
              },
            },
          ],
        },
      })}
      width="100%"
      height="100%"
      viewBox="-45 -24 735 500"
      fill="none"
    >
      <Defs>
        <LinearGradient
          id="ribbon-face"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop stopColor="#606a7b" />
          <Stop
            offset="1"
            stopColor="#353d4c"
          />
        </LinearGradient>
        <LinearGradient
          id="ribbon-side"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop stopColor="#464e5d" />
          <Stop
            offset="1"
            stopColor="#303743"
          />
        </LinearGradient>
      </Defs>
      <Path
        d="M-40 340H135Q155 340 160 320L211 119Q216 99 237 99H328M300 341H405Q425 341 430 321L485 106Q490 86 510 86H680M30 418L100 141"
        stroke="#667183"
        strokeWidth="1"
        opacity={0.55}
      />
      <Path
        d="M30 418L100 141Q104 126 120 126H210L160 324Q156 340 140 340H50"
        fill="url(#ribbon-side)"
        stroke="#697588"
      />
      <Path
        d="M183 340L267 24Q271 8 287 8H378L308 271Q304 287 288 287H247"
        fill="url(#ribbon-face)"
        stroke="#7c889b"
      />
      <Path
        d="M183 340L197 287H247M378 8L365 60"
        stroke="#0059ff"
        strokeWidth="4"
      />
      <Path
        d="M327 287L377 98Q381 82 397 82H487L437 271Q433 287 417 287H327Z"
        fill="url(#ribbon-side)"
        stroke="#697588"
      />
      <Circle
        cx="510"
        cy="86"
        r="4"
        fill="#0059ff"
      />
      <Circle
        cx="135"
        cy="340"
        r="3"
        fill="#a9b2c0"
      />
    </Svg>
  );
}

function LoginBackground() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <Defs>
        <RadialGradient
          id="login-background"
          cx="25%"
          cy="22%"
          r="100%"
        >
          <Stop stopColor="#454b56" />
          <Stop
            offset="40%"
            stopColor="#343a44"
          />
          <Stop
            offset="82%"
            stopColor="#252a32"
          />
        </RadialGradient>
      </Defs>
      <Rect
        width="100%"
        height="100%"
        fill="url(#login-background)"
      />
    </Svg>
  );
}

function LoginCardBackground() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient
          id="login-card-background"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <Stop
            stopColor="#eef1f6"
            stopOpacity={0.91}
          />
          <Stop
            offset="100%"
            stopColor="#d9dfe9"
            stopOpacity={0.84}
          />
        </LinearGradient>
      </Defs>
      <Rect
        width="100%"
        height="100%"
        fill="url(#login-card-background)"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wideLayout = width >= 960;
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
    <View style={styles.screen}>
      <LoginBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.page, wideLayout && styles.widePage]}>
              <View style={[styles.topbar, wideLayout && styles.wideTopbar]}>
                <View style={styles.brand}>
                  <Image
                    source={require('@/assets/images/logo-nova_b.svg')}
                    style={styles.logo}
                    contentFit="contain"
                    accessibilityLabel="NOVA"
                  />
                  <Text className="font-poppins-semibold text-2xl tracking-[-1px] text-[#f1f3f7]">
                    NOVA
                  </Text>
                </View>
                <Text className="font-poppins text-[11px] uppercase tracking-[2px] text-[#c0c6d1]">
                  Core Platform
                </Text>
              </View>

              <View style={[styles.content, wideLayout && styles.wideContent]}>
                {wideLayout ? (
                  <View style={styles.identityColumn}>
                    <View style={styles.identity}>
                      <View style={styles.graphic}>
                        <LoginGraphic />
                      </View>
                      <View style={styles.floorShadow} />
                      <View style={styles.identityCopy}>
                        <Text className="font-poppins-semibold text-[10px] uppercase tracking-[3px] text-[#c2c9d5]">
                          Tu trabajo, en conexión.
                        </Text>
                        <Text className="mt-[14px] font-poppins text-[38px] leading-[1.22] tracking-[-1.6px] text-[#f1f3f7]">
                          Una plataforma.{'\n'}Todo conectado.
                        </Text>
                        <Text className="mt-5 font-poppins text-[13px] leading-[1.5] text-[#c0c7d2]">
                          Todo lo que necesitas, en un solo lugar.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.access}>
                  <Card
                    className={`w-full self-center overflow-hidden border border-white/[0.52] bg-transparent p-0 ${wideLayout ? 'max-w-[454px] rounded-[23px]' : 'max-w-[400px] rounded-[20px]'}`}
                    style={styles.cardShadow}
                  >
                    <LoginCardBackground />
                    <View
                      style={
                        wideLayout
                          ? styles.desktopCardContent
                          : styles.mobileCardContent
                      }
                    >
                      <View style={styles.accent} />
                      <View style={styles.formHeader}>
                        <Text
                          className={`font-poppins-semibold tracking-[-0.9px] text-[#2e333d] ${wideLayout ? 'text-[25px]' : 'text-[24px]'}`}
                          style={wideLayout ? { lineHeight: 32.5 } : undefined}
                        >
                          Bienvenido a NOVA
                        </Text>
                        <Text className="mt-[10px] font-poppins text-xs leading-[1.7] text-[#454c58]">
                          Accede con tu usuario y contraseña.
                        </Text>
                      </View>

                      <View
                        className={wideLayout ? 'gap-[21px]' : 'gap-[18px]'}
                      >
                        <FormNText
                          control={control}
                          name="User"
                          label="Usuario"
                          labelClassName="font-poppins-semibold text-xs leading-[18px] text-[#2e333d]"
                          containerClassName="gap-[9px]"
                          placeholder="Tu usuario"
                          placeholderTextColor="#666e7b"
                          autoCapitalize="none"
                          autoCorrect={false}
                          clearable={false}
                          className={`${wideLayout ? 'h-[51px] text-sm' : 'h-[52px] text-base'} rounded-[9px] border-[#aeb5c0] bg-[#fafbfc] px-[14px] py-1 pr-[12px] text-[#2e333d] placeholder:text-[#666e7b] shadow-[inset_0_2px_4px_#252c3806]`}
                        />
                        <FormNText
                          control={control}
                          name="Password"
                          label="Contraseña"
                          labelClassName="font-poppins-semibold text-xs leading-[18px] text-[#2e333d]"
                          containerClassName="gap-[9px]"
                          placeholder="Tu contraseña"
                          placeholderTextColor="#666e7b"
                          secureTextEntry={!showPassword}
                          clearable={false}
                          className={`${wideLayout ? 'h-[51px] text-sm' : 'h-[52px] text-base'} rounded-[9px] border-[#aeb5c0] bg-[#fafbfc] px-[14px] py-1 pr-[52px] text-[#2e333d] placeholder:text-[#666e7b] shadow-[inset_0_2px_4px_#252c3806]`}
                          suffix={
                            <Pressable
                              accessibilityLabel={
                                showPassword
                                  ? 'Ocultar contraseña'
                                  : 'Mostrar contraseña'
                              }
                              accessibilityRole="button"
                              className="h-11 w-11 items-center justify-center rounded-lg"
                              style={{ transform: [{ translateX: -10 }] }}
                              onPress={() =>
                                setShowPassword((current) => !current)
                              }
                            >
                              {showPassword ? (
                                <EyeOff
                                  size={20}
                                  color="#667183"
                                />
                              ) : (
                                <Eye
                                  size={20}
                                  color="#667183"
                                />
                              )}
                            </Pressable>
                          }
                        />

                        {Error ? (
                          <View className="flex-row items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                            <Shield
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

                        <NButton
                          size="lg"
                          className={`justify-between rounded-[9px] border border-[#0024db] bg-[#002aff] px-[17px] ${wideLayout ? 'h-[51px]' : 'h-[52px]'}`}
                          style={styles.submitShadow}
                          disabled={IsLoading}
                          onPress={submit}
                          accessibilityRole="button"
                        >
                          <Text className="font-poppins-semibold text-[13px] text-white">
                            {IsLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
                          </Text>
                          {!IsLoading ? (
                            <ArrowRight
                              size={19}
                              color="white"
                            />
                          ) : null}
                        </NButton>
                      </View>

                      <View
                        style={[
                          styles.securityNote,
                          !wideLayout && styles.mobileSecurityNote,
                        ]}
                      >
                        <Shield
                          size={13}
                          color="#4b5563"
                        />
                        <Text className="font-poppins text-[10px] text-[#4b5563]">
                          Acceso seguro
                        </Text>
                      </View>
                    </View>
                  </Card>
                </View>
              </View>

              <View style={styles.footer}>
                <Text className="font-poppins text-[10px] tracking-[0.4px] text-[#b5becb]">
                  © 2026 NOVA
                </Text>
                {wideLayout ? (
                  <Text className="font-poppins text-[10px] text-[#b5becb]">
                    Un espacio para avanzar.
                  </Text>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#252a32' },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  widePage: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    paddingHorizontal: 64,
    paddingTop: 48,
    paddingBottom: 30,
    gap: 24,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  wideTopbar: { minHeight: 36 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 32, height: 25 },
  content: { flex: 1, justifyContent: 'center', paddingVertical: 12 },
  wideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64,
    paddingVertical: 40,
  },
  identityColumn: { flex: 1.25, minWidth: 0 },
  identity: { width: '100%', maxWidth: 630 },
  graphic: { width: '100%', aspectRatio: 735 / 500, maxHeight: 430 },
  floorShadow: {
    width: '60%',
    height: 30,
    marginTop: -41,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#14181f',
    opacity: 0.5,
    ...Platform.select({
      web: { filter: 'blur(20px)' },
      default: {
        shadowColor: '#14181f',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  identityCopy: { paddingTop: 27, paddingLeft: 22 },
  access: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  desktopCardContent: {
    paddingHorizontal: 38,
    paddingTop: 42,
    paddingBottom: 32,
  },
  mobileCardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  cardShadow: {
    position: 'relative',
    boxShadow: '0px 10px 12px #11172235, inset 0px 1px 0px #ffffff',
    elevation: 6,
  },
  submitShadow: { boxShadow: '0px 4px 8px #1729561a' },
  accent: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#002aff',
    marginBottom: 27,
  },
  formHeader: { marginBottom: 30 },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 23,
  },
  mobileSecurityNote: { marginTop: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
