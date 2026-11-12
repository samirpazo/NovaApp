import { useAuthStore } from '@/auth/store';
import { NButton } from '@/components/forms/NButton';
import { NText } from '@/components/forms/NText';
import { Text } from '@/components/ui/text';
import { KeyRound, Loader2 } from 'lucide-react-native';
import * as React from 'react';
import { Modal, ScrollView, View } from 'react-native';

interface ReauthenticateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Reautenticación sin perder el trabajo local.
 *
 * Cuando el servidor ya no renueva la credencial (la sesión expiró o la
 * credencial de dispositivo venció), el técnico debe volver a autenticarse para
 * seguir sincronizando. Este diálogo evita el ciclo de logout/login, que
 * dejaría la app fuera de la cuenta activa, y no toca la base local: las
 * visitas capturadas siguen ahí.
 */
export function ReauthenticateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ReauthenticateDialogProps) {
  const signIn = useAuthStore((state) => state.signIn);
  const IsLoading = useAuthStore((state) => state.IsLoading);
  const [user, setUser] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setUser('');
    setPassword('');
    setError(null);
  }, [open]);

  const submit = async () => {
    if (!user.trim() || !password) {
      setError('Ingrese su usuario y su contraseña.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(user.trim(), password);
      onOpenChange(false);
      onSuccess?.();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'No se pudo iniciar sesión.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 justify-center bg-black/50 p-5">
        <ScrollView
          className="max-w-md self-center"
          contentContainerClassName="gap-4 rounded-2xl border border-border bg-background p-5"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center gap-2">
            <KeyRound size={18} className="text-primary" />
            <Text className="font-poppins-semibold text-lg">
              Volver a iniciar sesión
            </Text>
          </View>
          <Text variant="caption">
            El servidor ya no renovó la sesión. Autentíquese de nuevo para
            seguir sincronizando. Los datos que ya tiene en el dispositivo no se
            han perdido.
          </Text>

          <NText
            label="Usuario"
            value={user}
            onChange={setUser}
            autoCapitalize="none"
            autoCorrect={false}
            required
          />
          <NText
            label="Contraseña"
            value={password}
            onChange={setPassword}
            secureTextEntry
            required
          />

          {error ? (
            <Text className="text-sm text-destructive">{error}</Text>
          ) : null}

          <View className="flex-row justify-end gap-2">
            <NButton
              variant="outline"
              onPress={() => onOpenChange(false)}
              disabled={submitting || IsLoading}
            >
              <Text>Cancelar</Text>
            </NButton>
            <NButton onPress={() => void submit()} disabled={submitting || IsLoading}>
              {submitting || IsLoading ? (
                <Loader2 size={15} className="text-primary-foreground" />
              ) : null}
              <Text>Iniciar sesión</Text>
            </NButton>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
