import {
  AuthResponseSchema,
  AuthSessionSchema,
  type AuthSession,
} from '@/contracts/auth';
import { api, getApiErrorMessage, setCsrfToken } from '@/lib/api';
import { hashPassword } from '@/lib/security';
import { storage } from '@/lib/storage';
import {
  clearAccessToken,
  clearRefreshToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '@/sync/config';
import { isAxiosError, type AxiosResponse } from 'axios';
import { Platform } from 'react-native';

const SESSION_KEY = 'nova.auth.session';
const refreshInFlight = new Map<string, Promise<AuthSession>>();
let authGeneration = 0;
let persistenceQueue = Promise.resolve();

function isCurrentGeneration(generation: number): boolean {
  return authGeneration === generation;
}

function enqueuePersistence<T>(
  generation: number,
  isCurrent: () => Promise<boolean>,
  persist: () => Promise<T>,
): Promise<T> {
  const operation = persistenceQueue.then(async () => {
    if (!isCurrentGeneration(generation) || !(await isCurrent()))
      throw new Error('La sesión cambió durante la renovación.');
    const result = await persist();
    if (!isCurrentGeneration(generation) || !(await isCurrent()))
      throw new Error('La sesión cambió durante la renovación.');
    return result;
  });
  persistenceQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function cookieValue(response: AxiosResponse, name: string): string | null {
  const header = response.headers['set-cookie'];
  if (!header) return null;
  const raw = Array.isArray(header) ? header.join(';') : String(header);
  return raw.match(new RegExp(`${name}=([^;]+)`, 'i'))?.[1] ?? null;
}

async function persistTokens(response: AxiosResponse): Promise<void> {
  if (Platform.OS === 'web') return;
  const accessToken =
    cookieValue(response, 'nova_app_access_token') ??
    cookieValue(response, 'nova_access_token');
  const refreshToken =
    cookieValue(response, 'nova_app_refresh_token') ??
    cookieValue(response, 'nova_refresh_token');
  if (!accessToken || !refreshToken)
    throw new Error('Nova no devolvió los tokens de la sesión móvil.');
  await Promise.all([
    saveAccessToken(accessToken),
    saveRefreshToken(refreshToken),
  ]);
}

async function persistSession(session: AuthSession): Promise<void> {
  await storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function login(
  user: string,
  password: string,
): Promise<AuthSession> {
  const generation = ++authGeneration;
  const isCurrent = async () => isCurrentGeneration(generation);
  try {
    if (!(await isCurrent())) throw new Error('La sesión cambió durante el inicio.');
    const response = await api.post('/Token', {
      User: user.trim(),
      Password: await hashPassword(password),
    });
    const envelope = AuthResponseSchema.parse(response.data);
    if (!envelope.Succeeded || !envelope.Data)
      throw new Error(envelope.Message || 'Credenciales inválidas.');
    await enqueuePersistence(generation, isCurrent, async () => {
      await persistTokens(response);
      await persistSession(envelope.Data!);
    });
    await initCsrf(isCurrent);
    return envelope.Data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
}

export function refreshSession(
  isCurrent: () => Promise<boolean> = async () => true,
  refreshKey = 'default',
): Promise<AuthSession> {
  const generation = authGeneration;
  const keyedRefresh = `${refreshKey}:${generation}`;
  let pending = refreshInFlight.get(keyedRefresh);
  if (!pending) {
    pending = performRefreshSession(isCurrent, generation).finally(() => {
      if (refreshInFlight.get(keyedRefresh) === pending)
        refreshInFlight.delete(keyedRefresh);
    });
    refreshInFlight.set(keyedRefresh, pending);
  }
  return pending;
}

async function performRefreshSession(
  isCurrent: () => Promise<boolean>,
  generation: number,
): Promise<AuthSession> {
  const isRefreshCurrent = async () =>
    isCurrentGeneration(generation) && (await isCurrent());
  const assertCurrent = async () => {
    if (!(await isRefreshCurrent()))
      throw new Error('La sesión cambió durante la renovación.');
  };
  await assertCurrent();
  const refreshToken = await getRefreshToken();
  await assertCurrent();
  const response = await api.post(
    '/Token/Refresh',
    Platform.OS === 'web' ? {} : { RefreshToken: refreshToken },
  );
  await assertCurrent();
  const envelope = AuthResponseSchema.parse(response.data);
  if (!envelope.Succeeded || !envelope.Data)
    throw new Error(envelope.Message || 'No se pudo renovar la sesión.');
  await enqueuePersistence(generation, isCurrent, async () => {
    await persistTokens(response);
    await persistSession(envelope.Data!);
  });
  await initCsrf(isRefreshCurrent);
  return envelope.Data;
}

export async function initCsrf(
  isCurrent: () => Promise<boolean> = async () => true,
): Promise<boolean> {
  if (Platform.OS !== 'web') return true;
  try {
    if (!(await isCurrent())) return false;
    const response = await api.get('/Token/CsrfToken');
    if (!(await isCurrent())) return false;
    const token =
      typeof response.data?.Data === 'string' ? response.data.Data : null;
    if (!token) return false;
    setCsrfToken(token);
    return true;
  } catch {
    // Login and refresh already succeeded. A future mutation can retry CSRF initialization.
    return false;
  }
}

async function clearSessionAtGeneration(generation: number): Promise<void> {
  if (!isCurrentGeneration(generation)) return;
  setCsrfToken(null);
  await enqueuePersistence(generation, async () => isCurrentGeneration(generation), async () => Promise.all([
    storage.removeItem(SESSION_KEY),
    clearAccessToken(),
    clearRefreshToken(),
  ]));
}

export async function clearLocalSession(): Promise<void> {
  await clearSessionAtGeneration(++authGeneration);
}

export function invalidateAuthOperations(): number {
  return ++authGeneration;
}

export function isTransientAuthFailure(error: unknown): boolean {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!isAxiosError(cause)) return false;
  const status = cause.response?.status;
  return !status || status >= 500 || status === 429;
}

export async function logoutSession(): Promise<void> {
  const generation = invalidateAuthOperations();
  try {
    await api.post('/Token/Logout');
  } catch {
    // Local logout must still complete while offline or after token expiration.
  } finally {
    await clearSessionAtGeneration(generation);
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

export function isSessionExpired(
  session: AuthSession,
  marginSeconds = 30,
): boolean {
  return (
    new Date(session.AccessTokenExpiration).getTime() - marginSeconds * 1000 <=
    Date.now()
  );
}

