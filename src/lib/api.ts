import { AxiosError, type InternalAxiosRequestConfig, create } from 'axios';
import { Platform } from 'react-native';

import { getAccessToken } from '@/sync/config';

const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL no está configurada.');
}

export const API_URL = configuredApiUrl.replace(/\/+$/, '');

let csrfRequestToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfRequestToken = token;
}

export function getCsrfToken(): string | null {
  return csrfRequestToken;
}

interface NovaRequestConfig extends InternalAxiosRequestConfig {
  _novaRetry?: boolean;
  _csrfRetry?: boolean;
}

let refreshingPromise: Promise<boolean> | null = null;

export const api = create({
  baseURL: API_URL,
  timeout: 30_000,
  withCredentials: Platform.OS === 'web',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(Platform.OS === 'web' ? {} : { 'X-Client-Platform': 'native' }),
  },
});

function attachSecurityInterceptors(): void {
  api.interceptors.request.use(async (config) => {
    const method = config.method?.toLowerCase();
    if (Platform.OS !== 'web') {
      const accessToken = await getAccessToken();
      if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
      else config.headers.delete('Authorization');
    }
    if (
      Platform.OS === 'web' &&
      method &&
      MUTATING_METHODS.includes(method) &&
      csrfRequestToken
    ) {
      config.headers.set('X-CSRF-TOKEN', csrfRequestToken);
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!(error instanceof AxiosError) || !error.config) throw error;
      const originalRequest = error.config as NovaRequestConfig;
      const status = error.response?.status;
      const isAuthEndpoint = (originalRequest.url ?? '').toLowerCase().includes('/token');
      const errData = error.response?.data as { Message?: string } | undefined;
      const csrfMessage = typeof errData?.Message === 'string' ? errData.Message : '';

      // Double-submit cookie auto-recovery: when a mutation is rejected because the
      // in-memory CSRF request token is missing/stale, re-initialize it and retry once.
      if (
        Platform.OS === 'web' &&
        status === 400 &&
        csrfMessage.includes('CSRF') &&
        !originalRequest._csrfRetry &&
        !isAuthEndpoint
      ) {
        originalRequest._csrfRetry = true;
        try {
          const { initCsrf } = await import('@/auth/service');
          await initCsrf();
          return api(originalRequest);
        } catch {
          // Fall through and reject with the original error.
        }
      }

      // Refresh-on-401 with a single in-flight promise. The original request is retried
      // once with the rotated access token (native) or the fresh cookies (web).
      if (status === 401 && !originalRequest._novaRetry && !isAuthEndpoint) {
        originalRequest._novaRetry = true;
        try {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            if (Platform.OS !== 'web') {
              const accessToken = await getAccessToken();
              if (accessToken) originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
            }
            return api(originalRequest);
          }
        } catch (refreshError) {
          throw refreshError;
        }
      }

      throw error;
    },
  );
}

attachSecurityInterceptors();

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = performRefresh().finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

async function performRefresh(): Promise<boolean> {
  try {
    const { refreshSession } = await import('@/auth/service');
    await refreshSession();
    return true;
  } catch (error) {
    const { isTransientAuthFailure } = await import('@/auth/service');
    if (isTransientAuthFailure(error)) return false;
    // Permanent failure (400/401/403 or an invalid refresh token): revoke the local session.
    const { useAuthStore } = await import('@/auth/store');
    await useAuthStore.getState().signOut();
    return false;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'Message' in data && typeof data.Message === 'string') {
      return data.Message;
    }
    if (error.code === 'ECONNABORTED') return 'La conexión con Nova agotó el tiempo de espera.';
    if (!error.response) return 'No se pudo conectar con el servidor de Nova.';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la sincronización.';
}
