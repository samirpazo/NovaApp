import type { AuthSession, CredentialState } from '@/contracts/auth';
import { create } from 'zustand';

import {
  clearLocalSession,
  credentialStateFor,
  getStoredSession,
  initCsrf,
  isRevokingFailure,
  isSessionExpired,
  login,
  logoutSession,
  renewServerCredential,
  ServerCredentialUnavailableError,
  type AuthFailureKind,
} from '@/auth/service';
import { getAccessToken } from '@/sync/config';
import { reportSyncTelemetry } from '@/sync/telemetry';

let authStateGeneration = 0;

/**
 * El guard de identidad compara la cuenta, no el identificador de sesión: una
 * renovación (incluido el canje por credencial de dispositivo) puede cambiar
 * el SsnID sin que el usuario haya cambiado de cuenta.
 */
function isCurrentSession(generation: number, session: AuthSession): boolean {
  const current = useAuthStore.getState();
  return (
    generation === authStateGeneration &&
    !current.IsLoading &&
    current.Session?.User.UsrID === session.User.UsrID
  );
}

interface AuthState {
  /** Sesión del dispositivo. Su presencia es la confianza local. */
  Session: AuthSession | null;
  /** Confianza local: el dispositivo puede operar con los datos locales. */
  IsAuthenticated: boolean;
  IsLoading: boolean;
  IsReady: boolean;
  Error: string | null;
  /** Estado de la credencial del servidor. Es una caché, no la identidad. */
  CredentialState: CredentialState;
  /** Motivo por el que la credencial del servidor no pudo renovarse. */
  CredentialReason: AuthFailureKind | null;
  /** La sincronización está detenida porque no hay credencial de servidor. */
  SyncBlocked: boolean;
  initialize: () => Promise<void>;
  resolveServerCredential: () => Promise<string | null>;
  applyCredentialFailure: (kind: AuthFailureKind) => void;
  revokeLocalTrust: (reason: AuthFailureKind) => Promise<void>;
  signIn: (user: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  Session: null,
  IsAuthenticated: false,
  IsLoading: false,
  IsReady: false,
  Error: null,
  CredentialState: 'unknown',
  CredentialReason: null,
  SyncBlocked: false,

  initialize: async () => {
    const generation = authStateGeneration;
    const storedSession = await getStoredSession();
    if (generation !== authStateGeneration) return;
    if (!storedSession) {
      set({ IsReady: true });
      return;
    }

    // La confianza local no caduca por tiempo: si el dispositivo tiene la
    // sesión guardada, la app abre y los datos locales están disponibles,
    // aunque el servidor sea inalcanzable.
    set({
      Session: storedSession,
      IsAuthenticated: true,
      CredentialState: storedSession.CredentialState ?? 'unknown',
      IsReady: true,
    });

    const isCurrent = async () => isCurrentSession(generation, storedSession);
    // La renovación ocurre en segundo plano: nunca bloquea el arranque.
    void renewCredentialInBackground(storedSession, isCurrent);
  },

  resolveServerCredential: async () => {
    const generation = authStateGeneration;
    const session = await getStoredSession();
    if (!session)
      throw new ServerCredentialUnavailableError(
        'session-expired',
        'Debe iniciar sesión antes de sincronizar.',
      );
    const isCurrent = async () => isCurrentSession(generation, session);
    if (!(await isCurrent()))
      throw new ServerCredentialUnavailableError(
        'session-expired',
        'La sesión cambió antes de preparar la sincronización.',
      );

    if (!isSessionExpired(session)) {
      const accessToken = await getAccessToken();
      if (accessToken) return accessToken;
    }

    const outcome = await renewServerCredential({ isCurrent });
    if (!outcome.ok) {
      if (isRevokingFailure(outcome.kind))
        await get().revokeLocalTrust(outcome.kind);
      else
        set({
          CredentialState: credentialStateFor(outcome.kind),
          CredentialReason: outcome.kind,
          SyncBlocked: true,
        });
      throw new ServerCredentialUnavailableError(outcome.kind, outcome.message);
    }
    if (!(await isCurrent()))
      throw new ServerCredentialUnavailableError(
        'session-expired',
        'La sesión cambió durante la renovación.',
      );
    set({
      Session: outcome.session,
      CredentialState: 'valid',
      CredentialReason: null,
      SyncBlocked: false,
    });
    return getAccessToken();
  },

  applyCredentialFailure: (kind) => {
    if (isRevokingFailure(kind)) {
      void get().revokeLocalTrust(kind);
      return;
    }
    set({
      CredentialState: credentialStateFor(kind),
      CredentialReason: kind,
      SyncBlocked: true,
    });
  },

  revokeLocalTrust: async (reason) => {
    authStateGeneration++;
    set({
      Session: null,
      IsAuthenticated: false,
      CredentialState: 'rejected',
      CredentialReason: reason,
      SyncBlocked: true,
      Error: null,
    });
    await clearLocalSession();
  },

  signIn: async (user, password) => {
    const generation = ++authStateGeneration;
    set({ IsLoading: true, Error: null });
    try {
      const Session = await login(user, password);
      if (generation === authStateGeneration)
        set({
          Session,
          IsAuthenticated: true,
          IsLoading: false,
          IsReady: true,
          CredentialState: 'valid',
          CredentialReason: null,
          SyncBlocked: false,
        });
    } catch (error) {
      if (generation !== authStateGeneration) throw error;
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      set({ Error: message, IsLoading: false, IsReady: true });
      throw error;
    }
  },

  signOut: async () => {
    authStateGeneration++;
    set({
      Session: null,
      IsAuthenticated: false,
      Error: null,
      CredentialState: 'unknown',
      CredentialReason: null,
      SyncBlocked: false,
    });
    await logoutSession();
  },
}));

/**
 * Renueva la credencial del servidor sin arriesgar la confianza local. Solo un
 * revocamiento explícito del servidor cierra la sesión del dispositivo.
 */
async function renewCredentialInBackground(
  session: AuthSession,
  isCurrent: () => Promise<boolean>,
): Promise<void> {
  const outcome = await renewServerCredential({ isCurrent });

  if (outcome.ok) {
    if (!(await isCurrent())) return;
    useAuthStore.setState({
      Session: outcome.session,
      IsAuthenticated: true,
      CredentialState: 'valid',
      CredentialReason: null,
      SyncBlocked: false,
    });
    // En web el token CSRF viaja en una cookie propia: hay que asegurarlo al
    // volver al primer plano aunque no haya hecho falta renovar la sesión.
    void initCsrf(isCurrent);
    return;
  }

  if (isRevokingFailure(outcome.kind)) {
    await useAuthStore.getState().revokeLocalTrust(outcome.kind);
    return;
  }

  if (!(await isCurrent())) return;
  reportSyncTelemetry({ event: 'credential_blocked' });
  useAuthStore.setState({
    CredentialState: credentialStateFor(outcome.kind),
    CredentialReason: outcome.kind,
    SyncBlocked: true,
  });
}
