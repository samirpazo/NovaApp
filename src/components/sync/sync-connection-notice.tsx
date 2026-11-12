import { useAuthStore } from '@/auth/store';
import { NButton } from '@/components/forms/NButton';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ReauthenticateDialog } from '@/components/sync/reauthenticate-dialog';
import { syncScheduler } from '@/sync/scheduler';
import { CloudOff, ShieldAlert } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

const REASONS: Record<string, string> = {
  offline: 'No hay conexión con el servidor de Nova.',
  'server-error': 'El servidor de Nova no está respondiendo.',
  'rate-limited': 'El servidor pidió esperar antes de intentarlo de nuevo.',
  'session-expired':
    'La sesión del servidor expiró y no se pudo renovar.',
  'device-expired': 'La credencial del dispositivo venció.',
  'device-revoked': 'La credencial de este dispositivo fue revocada.',
  'account-disabled': 'La cuenta ya no está habilitada en Nova.',
  'account-expired': 'La cuenta venció en Nova.',
  unknown: 'No se pudo obtener una credencial del servidor de Nova.',
};

/**
 * Motivos que solo se resuelven autenticándose de nuevo. Los demás son
 * transitorios: reintentar solo.
 */
const NEEDS_REAUTHENTICATION = [
  'session-expired',
  'device-expired',
  'device-revoked',
  'account-disabled',
  'account-expired',
];

/**
 * Aviso no bloqueante: informa que la sincronización está detenida mientras el
 * trabajo local continúa disponible. Nunca oculta la app ni impide capturar
 * visitas sin conexión.
 */
export function NSyncConnectionNotice() {
  const SyncBlocked = useAuthStore((state) => state.SyncBlocked);
  const CredentialReason = useAuthStore((state) => state.CredentialReason);
  const IsAuthenticated = useAuthStore((state) => state.IsAuthenticated);
  const [reauthenticateOpen, setReauthenticateOpen] = React.useState(false);

  if (!IsAuthenticated || !SyncBlocked) return null;

  const reason = CredentialReason ? REASONS[CredentialReason] : undefined;
  const revoked =
    CredentialReason === 'device-revoked' ||
    CredentialReason === 'account-disabled' ||
    CredentialReason === 'account-expired';
  const needsReauthentication =
    revoked ||
    (CredentialReason ? NEEDS_REAUTHENTICATION.includes(CredentialReason) : false);

  return (
    <>
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
          {reason ??
            'No se pudo obtener una credencial del servidor de Nova.'}{' '}
          Tus datos locales siguen guardados y no se han perdido.
        </Text>
        {needsReauthentication ? (
          <NButton
            className="h-9"
            variant="outline"
            onPress={() => setReauthenticateOpen(true)}
          >
            <Text>Volver a iniciar sesión</Text>
          </NButton>
        ) : null}
      </Card>

      <ReauthenticateDialog
        open={reauthenticateOpen}
        onOpenChange={setReauthenticateOpen}
        onSuccess={() => {
          // El usuario acaba de autenticarse: se reintenta la sincronización
          // de inmediato en lugar de esperar al próximo ciclo.
          void syncScheduler.trigger('foreground', { force: true });
        }}
      />
    </>
  );
}
