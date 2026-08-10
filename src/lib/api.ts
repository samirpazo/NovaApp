import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig, create } from 'axios';
import { Platform } from 'react-native';

import { getAccessToken } from '@/sync/config';

export interface ApiClientOptions {
  baseUrl: string;
  accessToken?: string | null;
}

const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

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

export function createApiClient({ baseUrl, accessToken }: ApiClientOptions): AxiosInstance {
  const client = create({
    baseURL: baseUrl.replace(/\/+$/, ''),
    timeout: 30_000,
    withCredentials: Platform.OS === 'web',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(Platform.OS === 'web' ? {} : { 'X-Client-Platform': 'native' }),
    },
  });

  attachSecurityInterceptors(client);
  return client;
}

function attachSecurityInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const method = config.method?.toLowerCase();
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

  client.interceptors.response.use(
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
          await initCsrf(String(originalRequest.baseURL ?? ''));
          return client(originalRequest);
        } catch {
          // Fall through and reject with the original error.
        }
      }

      // Refresh-on-401 with a single in-flight promise. The original request is retried
      // once with the rotated access token (native) or the fresh cookies (web).
      if (status === 401 && !originalRequest._novaRetry && !isAuthEndpoint) {
        originalRequest._novaRetry = true;
        try {
          const refreshed = await refreshAccessToken(String(originalRequest.baseURL ?? ''));
          if (refreshed) {
            if (Platform.OS !== 'web') {
              const accessToken = await getAccessToken();
              if (accessToken) originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
            }
            return client(originalRequest);
          }
        } catch (refreshError) {
          throw refreshError;
        }
      }

      throw error;
    },
  );
}

async function refreshAccessToken(baseUrl: string): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = performRefresh(baseUrl).finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

async function performRefresh(baseUrl: string): Promise<boolean> {
  try {
    const { refreshSession } = await import('@/auth/service');
    await refreshSession(baseUrl);
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
