import type { Database } from '@nozbe/watermelondb';

import { getStoredSession } from '@/auth/service';
import { activateAccountDatabase } from '@/database';
import { getSyncConnection } from '@/sync/config';
import { activateSyncScope } from '@/sync/scope';

export interface HeadlessScope {
  userId: number;
  personId: number;
  identityKey: string;
  database: Database;
}

/**
 * Activa el ámbito de la cuenta sin depender de React.
 *
 * La tarea en segundo plano arranca en un contexto de JavaScript frío: no hay
 * `AuthGate` montado, por lo que el almacén de sesiones está vacío. Esta
 * función reconstruye el mismo estado que el guard de rutas, leyendo la
 * sesión del almacenamiento seguro del dispositivo.
 */
export async function activateHeadlessScope(): Promise<HeadlessScope | null> {
  const session = await getStoredSession();
  if (!session) return null;

  const connection = await getSyncConnection();
  if (!connection) return null;

  const userId = session.User.UsrID;
  const personId = session.User.PrsID ?? 0;

  const { useAuthStore } = await import('@/auth/store');
  const current = useAuthStore.getState();
  if (!current.Session) {
    useAuthStore.setState({
      Session: session,
      IsAuthenticated: true,
      IsReady: true,
    });
  }

  const active = await activateAccountDatabase(
    connection,
    {
      BaseUrl: connection.BaseUrl,
      UsrID: userId,
      PrsID: personId,
    },
    () => true,
  );

  const scope = await activateSyncScope(
    active.database,
    connection,
    userId,
    personId,
    () => true,
  );
  if (!scope.ready) return null;

  return {
    userId,
    personId,
    identityKey: active.identityKey,
    database: active.database,
  };
}
