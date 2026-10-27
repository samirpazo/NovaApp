import {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  create,
} from 'axios';
import { Platform } from 'react-native';

import { getActiveIdentityKey } from '@/database';
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
  _novaUserId?: number;
  _novaIdentityKey?: string;
  _novaSessionId?: number;
}

const refreshingPromises = new Map<string, Promise<boolean>>();

export const api = create({
  baseURL: API_URL,
  timeout: 30_000,
  withCredentials: Platform.OS === 'web',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Nova-Client': 'nova-app',
    ...(Platform.OS === 'web' ? {} : { 'X-Client-Platform': 'native' }),
  },
});

function attachSecurityInterceptors(): void {
  api.interceptors.request.use(async (config) => {
    const novaConfig = config as NovaRequestConfig;
    const method = config.method?.toLowerCase();
    if (novaConfig._novaUserId !== undefined) {
      const { useAuthStore } = await import('@/auth/store');
      const auth = useAuthStore.getState();
      if (
        auth.IsLoading ||
        auth.Session?.User.UsrID !== novaConfig._novaUserId ||
        (novaConfig._novaIdentityKey &&
          getActiveIdentityKey() !== novaConfig._novaIdentityKey)
      )
        throw new Error('La sesión cambió antes de enviar la solicitud.');
      novaConfig._novaSessionId = auth.Session.SsnID;
    }
    if (Platform.OS !== 'web') {
      const accessToken = await getAccessToken();
      if (novaConfig._novaUserId !== undefined) {
        const { useAuthStore } = await import('@/auth/store');
        const auth = useAuthStore.getState();
        if (
          auth.IsLoading ||
          auth.Session?.User.UsrID !== novaConfig._novaUserId ||
          (novaConfig._novaIdentityKey &&
            getActiveIdentityKey() !== novaConfig._novaIdentityKey)
        )
          throw new Error('La sesión cambió antes de enviar la solicitud.');
      }
      if (accessToken)
        config.headers.set('Authorization', `Bearer ${accessToken}`);
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
      if (originalRequest._novaUserId !== undefined) {
        const { useAuthStore } = await import('@/auth/store');
        const auth = useAuthStore.getState();
        if (
          auth.IsLoading ||
          auth.Session?.User.UsrID !== originalRequest._novaUserId ||
          auth.Session?.SsnID !== originalRequest._novaSessionId ||
          (originalRequest._novaIdentityKey &&
            getActiveIdentityKey() !== originalRequest._novaIdentityKey)
        )
          throw error;
      }
      const status = error.response?.status;
      const isAuthEndpoint = (originalRequest.url ?? '')
        .toLowerCase()
        .includes('/token');
      const errData = error.response?.data as { Message?: string } | undefined;
      const csrfMessage =
        typeof errData?.Message === 'string' ? errData.Message : '';

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
          const refreshed = await refreshAccessToken(
            originalRequest._novaUserId,
            originalRequest._novaIdentityKey,
            originalRequest._novaSessionId,
          );
          if (
            refreshed &&
            originalRequest._novaUserId !== undefined &&
            originalRequest._novaIdentityKey &&
            originalRequest._novaSessionId !== undefined &&
            (await isRequestIdentityCurrent(
              originalRequest._novaUserId,
              originalRequest._novaIdentityKey,
              originalRequest._novaSessionId,
            ))
          ) {
            if (Platform.OS !== 'web') {
              const accessToken = await getAccessToken();
              if (accessToken)
                originalRequest.headers.set(
                  'Authorization',
                  `Bearer ${accessToken}`,
                );
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

export function postForUser<T = unknown>(
  url: string,
  data: unknown,
  userId: number,
  requestConfig: AxiosRequestConfig = {},
  identityKey = getActiveIdentityKey() ?? undefined,
) {
  return api.post<T>(url, data, {
    ...requestConfig,
    _novaUserId: userId,
    _novaIdentityKey: identityKey,
  } as NovaRequestConfig);
}

export function getForUser<T = unknown>(
  url: string,
  userId: number,
  requestConfig: AxiosRequestConfig = {},
  identityKey = getActiveIdentityKey() ?? undefined,
) {
  return api.get<T>(url, {
    ...requestConfig,
    _novaUserId: userId,
    _novaIdentityKey: identityKey,
  } as NovaRequestConfig);
}

async function refreshAccessToken(
  userId: number | undefined,
  identityKey: string | undefined,
  sessionId: number | undefined,
): Promise<boolean> {
  if (userId === undefined || !identityKey || sessionId === undefined)
    return false;
  const refreshKey = `${identityKey}:${sessionId}`;
  let promise = refreshingPromises.get(refreshKey);
  if (!promise) {
    promise = performRefresh(
      () => isRequestIdentityCurrent(userId, identityKey, sessionId),
      refreshKey,
    ).finally(() => {
      if (refreshingPromises.get(refreshKey) === promise)
        refreshingPromises.delete(refreshKey);
    });
    refreshingPromises.set(refreshKey, promise);
  }
  return promise;
}

async function isRequestIdentityCurrent(
  userId: number,
  identityKey: string,
  sessionId: number,
): Promise<boolean> {
  const { useAuthStore } = await import('@/auth/store');
  const auth = useAuthStore.getState();
  return (
    !auth.IsLoading &&
    auth.Session?.User.UsrID === userId &&
    auth.Session.SsnID === sessionId &&
    getActiveIdentityKey() === identityKey
  );
}

async function performRefresh(
  isCurrent: () => Promise<boolean>,
  identityKeyForRefresh: string,
): Promise<boolean> {
  try {
    if (!(await isCurrent())) return false;
    const { refreshSession } = await import('@/auth/service');
    await refreshSession(isCurrent, identityKeyForRefresh);
    return isCurrent();
  } catch (error) {
    if (!(await isCurrent())) return false;
    const { isTransientAuthFailure } = await import('@/auth/service');
    if (isTransientAuthFailure(error)) return false;
    // Permanent failure (400/401/403 or an invalid refresh token): revoke the local session.
    const { useAuthStore } = await import('@/auth/store');
    if (!(await isCurrent())) return false;
    await useAuthStore.getState().signOut();
    return false;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const body = data as Record<string, unknown>;
      for (const key of ['Message', 'message', 'detail']) {
        const message = body[key];
        if (typeof message === 'string' && message.trim()) return message;
      }
      const errors = body.errors;
      if (Array.isArray(errors)) {
        for (const item of errors) {
          if (!item || typeof item !== 'object') continue;
          const detail = item as Record<string, unknown>;
          for (const key of ['Detail', 'detail', 'Message', 'message']) {
            const message = detail[key];
            if (typeof message === 'string' && message.trim()) return message;
          }
        }
      } else if (errors && typeof errors === 'object') {
        for (const messages of Object.values(errors)) {
          if (Array.isArray(messages) && typeof messages[0] === 'string')
            return messages[0];
        }
      }
      if (typeof body.title === 'string' && body.title.trim())
        return body.title;
    }
    if (error.code === 'ECONNABORTED')
      return 'La conexión con Nova agotó el tiempo de espera.';
    if (!error.response) return 'No se pudo conectar con el servidor de Nova.';
  }
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la sincronización.';
}
