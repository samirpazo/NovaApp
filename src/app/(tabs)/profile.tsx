import { useAuthStore } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { LogOut, Palette, UserRound } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

export default function ProfileTab() {
  const router = useRouter();
  const { Session, signOut } = useAuthStore();
  const user = Session?.User;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="mx-auto w-full max-w-3xl gap-3 pb-20 pt-3">
      <View>
        <Text className="font-poppins-semibold text-lg">Perfil</Text>
        <Text variant="caption">Cuenta y preferencias</Text>
      </View>
      <Card className="flex-row items-center gap-2 p-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-muted">
          <UserRound size={18} className="text-foreground" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="small" numberOfLines={1}>{user?.FullName || user?.UsrName}</Text>
          <Text variant="caption" numberOfLines={1}>{user?.UsrEmail || user?.UsrName}</Text>
        </View>
      </Card>
      <Button className="h-9" variant="outline" onPress={() => router.push('/appearance')}>
        <Palette size={15} />
        <Text>Personalizar apariencia</Text>
      </Button>
      <Button
        className="h-9"
        variant="ghost"
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}>
        <LogOut size={17} />
        <Text>Cerrar sesión</Text>
      </Button>
    </ScrollView>
  );
}
