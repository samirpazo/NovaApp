import { useAuthStore } from '@/auth/store';
import { NButton } from '@/components/forms/NButton';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CloudOff, ShieldAlert } from 'lucide-react-native';
import { View } from 'react-native';

const REASONS: Record<string, string> = {
  offline: 'No hay conexión con el servidor de Nova.',
  'server-error': 'El servidor de Nova no está respondiendo.',
  'rate-limited': 'El servidor pidió esperar antes de intentarlo de nuevo.',
  'session-expired': 'La sesión del servidor expiró y no se pudo renovar.',
  'device-expired': 'La credencial del dispositivo venció.',
  'device-revoked': 'La credencial de este dispositivo fue revocada.',
  'account-disabled': 'La cuenta ya no está habilitada en Nova.',
  'account-expired': 'La cuenta venció en Nova.',
  unknown: 'No se pudo obtener una credencial del servidor de Nova.',
};

/**
 * Aviso no bloqueante: informa que la sincronización está detenida mientras el
 * trabajo local continúa disponible. Nunca oculta la app ni impide capturar
 * visitas sin conexión.
 */
export function NSyncConnectionNotice() {
  const SyncBlocked = useAuthStore((state) => state.SyncBlocked);
  const CredentialReason = useAuthStore((state) => state.CredentialReason);
  const IsAuthenticated = useAuthStore((state) => state.IsAuthenticated);

  if (!IsAuthenticated || !SyncBlocked) return null;

  const reason = CredentialReason ? REASONS[CredentialReason] : undefined;
  const revoked =
    CredentialReason === 'device-revoked' ||
    CredentialReason === 'account-disabled' ||
    CredentialReason === 'account-expired';

  return (
    <Card className="gap-2 border-destructive/40 bg-destructive/5 p-3">
      <View className="flex-row items-center gap-2">
        {revoked ? (
          <ShieldAlert
            size={17}
            className="text-destructive"
          />
        ) : (
          <CloudOff
            size={17}
            className="text-destructive"
          />
        )}
        <Text
          variant="small"
          className="text-destructive"
        >
          {revoked
            ? 'Esta cuenta ya no puede sincronizar'
            : 'Sin sincronización con Nova'}
        </Text>
      </View>
      <Text variant="caption">
        {reason ?? 'No se pudo obtener una credencial del servidor de Nova.'}{' '}
        Tus datos locales siguen guardados y no se han perdido.
      </Text>
      {revoked ? (
        <NButton
          className="h-9"
          variant="outline"
          onPress={() => void useAuthStore.getState().signOut()}
        >
          <Text>Iniciar sesión de nuevo</Text>
        </NButton>
      ) : null}
    </Card>
  );
}
