import type { AuthSession } from '@/contracts/auth';
import { create } from 'zustand';

import {
  clearLocalSession,
  getStoredSession,
  initCsrf,
  isSessionExpired,
  isTransientAuthFailure,
  login,
  logoutSession,
  refreshSession,
} from '@/auth/service';
import { getAccessToken } from '@/sync/config';

let authStateGeneration = 0;

function isCurrentSession(
  generation: number,
  session: AuthSession,
): boolean {
  const current = useAuthStore.getState();
  return (
    generation === authStateGeneration &&
    !current.IsLoading &&
    current.Session?.SsnID === session.SsnID &&
    current.Session.User.UsrID === session.User.UsrID
  );
}

interface AuthState {
  Session: AuthSession | null;
  IsAuthenticated: boolean;
  IsLoading: boolean;
  IsReady: boolean;
  Error: string | null;
  initialize: () => Promise<void>;
  ensureOnlineSession: () => Promise<string | null>;
  signIn: (user: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  Session: null,
  IsAuthenticated: false,
  IsLoading: false,
  IsReady: false,
  Error: null,

  initialize: async () => {
    const generation = authStateGeneration;
    const storedSession = await getStoredSession();
    if (generation !== authStateGeneration) return;
    if (!storedSession) {
      set({ IsReady: true });
      return;
    }

    set({ Session: storedSession, IsAuthenticated: true });
    const isCurrent = async () => isCurrentSession(generation, storedSession);
    if (isSessionExpired(storedSession)) {
      try {
        const Session = await refreshSession(
          isCurrent,
          `auth:${storedSession.SsnID}`,
        );
        if (!(await isCurrent())) return;
        set({ Session });
      } catch (error) {
        if (!(await isCurrent())) return;
        if (!isTransientAuthFailure(error)) {
          await clearLocalSession();
          if (await isCurrent()) set({ Session: null, IsAuthenticated: false });
        }
      }
    }
    if (generation !== authStateGeneration) return;
    if (useAuthStore.getState().IsAuthenticated) {
      await initCsrf(isCurrent);
    }
    if (generation === authStateGeneration) set({ IsReady: true });
  },

  ensureOnlineSession: async () => {
    const generation = authStateGeneration;
    const session = await getStoredSession();
    if (!session) throw new Error('Debe iniciar sesión antes de sincronizar.');
    const isCurrent = async () => isCurrentSession(generation, session);
    if (!(await isCurrent()))
      throw new Error('La sesión cambió antes de preparar la sincronización.');
    if (isSessionExpired(session)) {
      try {
        const Session = await refreshSession(isCurrent, `auth:${session.SsnID}`);
        if (!(await isCurrent()))
          throw new Error('La sesión cambió durante la renovación.');
        set({ Session, IsAuthenticated: true });
      } catch (error) {
        if (await isCurrent() && !isTransientAuthFailure(error))
          await useAuthStore.getState().signOut();
        throw error;
      }
    }
    if (!(await isCurrent()))
      throw new Error('La sesión cambió antes de preparar la sincronización.');
    const accessToken = await getAccessToken();
    if (!(await isCurrent()))
      throw new Error('La sesión cambió antes de preparar la sincronización.');
    return accessToken;
  },

  signIn: async (user, password) => {
    const generation = ++authStateGeneration;
    set({ IsLoading: true, Error: null });
    try {
      const Session = await login(user, password);
      if (generation === authStateGeneration)
        set({ Session, IsAuthenticated: true, IsLoading: false, IsReady: true });
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
    set({ Session: null, IsAuthenticated: false, Error: null });
    await logoutSession();
  },
}));
