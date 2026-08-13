import { AuthResponseSchema, AuthSessionSchema, type AuthSession } from '@/contracts/auth';
import { api, getApiErrorMessage, setCsrfToken } from '@/lib/api';
import { hashPassword } from '@/lib/security';
import { storage } from '@/lib/storage';
import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '@/sync/config';
import { isAxiosError, type AxiosResponse } from 'axios';
import { Platform } from 'react-native';

const SESSION_KEY = 'nova.auth.session';

function cookieValue(response: AxiosResponse, name: string): string | null {
  const header = response.headers['set-cookie'];
  if (!header) return null;
  const raw = Array.isArray(header) ? header.join(';') : String(header);
  return raw.match(new RegExp(`${name}=([^;]+)`, 'i'))?.[1] ?? null;
}

async function persistTokens(response: AxiosResponse): Promise<void> {
  if (Platform.OS === 'web') return;
  const accessToken = cookieValue(response, 'nova_access_token');
  const refreshToken = cookieValue(response, 'nova_refresh_token');
  if (!accessToken || !refreshToken) throw new Error('Nova no devolvió los tokens de la sesión móvil.');
  await Promise.all([saveAccessToken(accessToken), saveRefreshToken(refreshToken)]);
}

async function persistSession(session: AuthSession): Promise<void> {
  await storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function login(user: string, password: string): Promise<AuthSession> {
  try {
    const response = await api.post('/Token', { User: user.trim(), Password: await hashPassword(password) });
    const envelope = AuthResponseSchema.parse(response.data);
    if (!envelope.Succeeded || !envelope.Data) throw new Error(envelope.Message || 'Credenciales inválidas.');
    await persistTokens(response);
    await persistSession(envelope.Data);
    await initCsrf();
    return envelope.Data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
}

export async function refreshSession(): Promise<AuthSession> {
  const refreshToken = await getRefreshToken();
  const response = await api.post('/Token/Refresh', Platform.OS === 'web' ? {} : { RefreshToken: refreshToken });
  const envelope = AuthResponseSchema.parse(response.data);
  if (!envelope.Succeeded || !envelope.Data) throw new Error(envelope.Message || 'No se pudo renovar la sesión.');
  await persistTokens(response);
  await persistSession(envelope.Data);
  await initCsrf();
  return envelope.Data;
}

export async function initCsrf(): Promise<boolean> {
  if (Platform.OS !== 'web') return true;
  try {
    const response = await api.get('/Token/CsrfToken');
    const token = typeof response.data?.Data === 'string' ? response.data.Data : null;
    if (!token) return false;
    setCsrfToken(token);
    return true;
  } catch {
    // Login and refresh already succeeded. A future mutation can retry CSRF initialization.
    return false;
  }
}

export async function clearLocalSession(): Promise<void> {
  setCsrfToken(null);
  await Promise.all([storage.removeItem(SESSION_KEY), clearAccessToken(), clearRefreshToken()]);
}

export function isTransientAuthFailure(error: unknown): boolean {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!isAxiosError(cause)) return false;
  const status = cause.response?.status;
  return !status || status >= 500 || status === 429;
}

export async function logoutSession(): Promise<void> {
  try {
    await api.post('/Token/Logout');
  } catch {
    // Local logout must still complete while offline or after token expiration.
  } finally {
    await clearLocalSession();
  }
}

export async function getStoredSession(): Promise<AuthSession | null> {
  const value = await storage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    const parsed = AuthSessionSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isSessionExpired(session: AuthSession, marginSeconds = 30): boolean {
  return new Date(session.AccessTokenExpiration).getTime() - marginSeconds * 1000 <= Date.now();
}

export async function ensureOnlineSession(): Promise<string | null> {
  const session = await getStoredSession();
  if (!session) throw new Error('Debe iniciar sesión antes de sincronizar.');
  if (isSessionExpired(session)) await refreshSession();
  return getAccessToken();
}
