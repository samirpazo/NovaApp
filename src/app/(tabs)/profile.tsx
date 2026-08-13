import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Hash,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface AccountRowProps {
  icon: typeof UserRound;
  label: string;
  value: string;
}

function AccountRow({ icon: Icon, label, value }: AccountRowProps) {
  return (
    <View className="flex-row items-center gap-2.5 border-b border-border py-2.5 last:border-b-0">
      <View className="h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon size={15} className="text-muted-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="caption">{label}</Text>
        <Text variant="small" numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { Session, signOut } = useAuthStore();
  const user = Session?.User;
  const displayName = user?.FullName || user?.UsrName || 'Usuario';
  const qrValue = `nova:user:${user?.UsrID ?? 0}`;

  const logout = async () => {
    await signOut();
    router.replace('/login');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('¿Cerrar la sesión actual?')) void logout();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Cerrar la sesión actual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-3xl gap-3 pb-20 pt-3"
      showsVerticalScrollIndicator={false}>
      <View>
        <Text className="font-poppins-semibold text-lg">Perfil</Text>
        <Text variant="caption">Cuenta, identificación y preferencias</Text>
      </View>

      <View className="flex-row items-center gap-3 py-1">
        <View className="h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
          <Text className="font-poppins-semibold text-lg">
            {displayName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-semibold text-base" numberOfLines={1}>{displayName}</Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-success" />
            <Text variant="caption">Sesión activa</Text>
          </View>
        </View>
      </View>

      <Card className="px-3">
        <AccountRow icon={UserRound} label="Usuario" value={user?.UsrName || 'No registrado'} />
        <AccountRow icon={Mail} label="Correo" value={user?.UsrEmail || 'No registrado'} />
        <AccountRow icon={Hash} label="Identificador" value={String(user?.UsrID ?? 'No registrado')} />
      </Card>

      <Card className="items-center gap-2.5 p-3">
        <View className="flex-row items-center gap-2 self-stretch">
          <ShieldCheck size={16} className="text-primary" />
          <View className="min-w-0 flex-1">
            <Text variant="small">Credencial QR</Text>
            <Text variant="caption">Identifica tu cuenta dentro de Nova</Text>
          </View>
        </View>
        <View className="rounded-md bg-white p-2.5">
          <QRCode value={qrValue} size={120} color="#18181b" backgroundColor="#ffffff" />
        </View>
        <Text variant="caption" className="text-center">Presenta este código cuando un proceso de Nova lo solicite</Text>
      </Card>

      <View className="gap-2">
        <Text variant="small">Preferencias</Text>
        <Button className="h-10 justify-start px-3" variant="outline" onPress={() => router.push('/appearance')}>
          <Palette size={16} className="text-primary" />
          <Text className="min-w-0 flex-1 text-left">Personalizar apariencia</Text>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Button>
      </View>

      <Button className="h-10" variant="ghost" onPress={confirmLogout}>
        <LogOut size={16} className="text-destructive" />
        <Text className="text-destructive">Cerrar sesión</Text>
      </Button>
    </ScrollView>
  );
}
