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

interface AuthState {
  Session: AuthSession | null;
  IsAuthenticated: boolean;
  IsLoading: boolean;
  IsReady: boolean;
  Error: string | null;
  initialize: () => Promise<void>;
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
    const storedSession = await getStoredSession();
    if (!storedSession) {
      set({ IsReady: true });
      return;
    }

    set({ Session: storedSession, IsAuthenticated: true });
    if (isSessionExpired(storedSession)) {
      try {
        const Session = await refreshSession();
        set({ Session });
      } catch (error) {
        if (!isTransientAuthFailure(error)) {
          await clearLocalSession();
          set({ Session: null, IsAuthenticated: false });
        }
      }
    }
    if (useAuthStore.getState().IsAuthenticated) {
      await initCsrf();
    }
    set({ IsReady: true });
  },

  signIn: async (user, password) => {
    set({ IsLoading: true, Error: null });
    try {
      const Session = await login(user, password);
      set({ Session, IsAuthenticated: true, IsLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      set({ Error: message, IsLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ Session: null, IsAuthenticated: false, Error: null });
    await logoutSession();
  },
}));
