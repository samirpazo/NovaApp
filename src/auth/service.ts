import {
  AuthResponseSchema,
  AuthSessionSchema,
  SessionStatusResponseSchema,
  type AuthSession,
  type CredentialState,
} from '@/contracts/auth';
import { api, getApiErrorMessage, setCsrfToken } from '@/lib/api';
import { hashPassword } from '@/lib/security';
import { storage } from '@/lib/storage';
import { reportSyncTelemetry } from '@/sync/telemetry';
import {
  clearAccessToken,
  clearDeviceToken,
  clearRefreshToken,
  getAccessToken,
  getDeviceToken,
  getRefreshToken,
  saveAccessToken,
  saveDeviceToken,
  saveRefreshToken,
} from '@/sync/config';
import { isAxiosError, type AxiosResponse } from 'axios';
import { Platform } from 'react-native';

const SESSION_KEY = 'nova.auth.session';
const refreshInFlight = new Map<string, Promise<AuthSession>>();
let authGeneration = 0;
let persistenceQueue = Promise.resolve();
/**
 * Marca que el servidor rechazó la credencial actual. Evita que un access
 * token aparentemente vigente se vuelva a usar y provoque un 401 en cada
 * petición: cuando se sabe que está muerto, se pasa directo a la renovación.
 */
let credentialRejected = false;

/**
 * Motivo por el que una credencial del servidor no pudo renovarse.
 *
 * Ninguno de estos motivos implica cerrar la sesión local: la confianza del
 * dispositivo solo se pierde cuando el servidor revoca expresamente la
 * credencial o cuando la cuenta deja de estar habilitada.
 */
export type AuthFailureKind =
  | 'offline'
  | 'server-error'
  | 'rate-limited'
  | 'session-expired'
  | 'device-expired'
  | 'device-revoked'
  | 'account-disabled'
  | 'account-expired'
  | 'unknown';

export class ServerCredentialUnavailableError extends Error {
  readonly kind: AuthFailureKind;

  constructor(kind: AuthFailureKind, message: string) {
    super(message);
    this.name = 'ServerCredentialUnavailableError';
    this.kind = kind;
  }
}

/**
 * Error de concurrencia: la cuenta cambió mientras se renovaba la sesión. No
 * es un problema de credencial, así que no dispara la vía de recuperación.
 */
export class SessionChangedError extends Error {
  constructor() {
    super('La sesión cambió durante la renovación.');
    this.name = 'SessionChangedError';
  }
}

export type RenewOutcome =
  | { ok: true; session: AuthSession }
  | { ok: false; kind: AuthFailureKind; message: string };

/** Fallos que impiden seguir operando aunque el servidor vuelva a estar disponible. */
const REVOKING_FAILURES: AuthFailureKind[] = [
  'device-revoked',
  'account-disabled',
  'account-expired',
];

export function isRevokingFailure(kind: AuthFailureKind): boolean {
  return REVOKING_FAILURES.includes(kind);
}

export function credentialStateFor(kind: AuthFailureKind): CredentialState {
  if (kind === 'offline' || kind === 'server-error' || kind === 'rate-limited')
    return 'stale';
  if (kind === 'unknown') return 'unknown';
  return 'rejected';
}

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
      throw new SessionChangedError();
    const result = await persist();
    if (!isCurrentGeneration(generation) || !(await isCurrent()))
      throw new SessionChangedError();
    return result;
  });
  persistenceQueue = operation.then(
    () => undefined,
    () => undefined,
  );
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

/**
 * Guarda la credencial de larga duración del dispositivo. Solo existe en
 * nativo: en web el refresh token viaja en una cookie HttpOnly.
 */
async function persistDeviceToken(deviceToken?: string | null): Promise<void> {
  if (!deviceToken) return;
  await saveDeviceToken(deviceToken);
}

export async function login(
  user: string,
  password: string,
): Promise<AuthSession> {
  const generation = ++authGeneration;
  const isCurrent = async () => isCurrentGeneration(generation);
  try {
    if (!(await isCurrent()))
      throw new Error('La sesión cambió durante el inicio.');
    const response = await api.post('/Token', {
      User: user.trim(),
      Password: await hashPassword(password),
    });
    const envelope = AuthResponseSchema.parse(response.data);
    if (!envelope.Succeeded || !envelope.Data)
      throw new Error(envelope.Message || 'Credenciales inválidas.');
    await enqueuePersistence(generation, isCurrent, async () => {
      await persistTokens(response);
      await persistDeviceToken(envelope.Data!.DeviceToken);
      await persistSession(envelope.Data!);
    });
    credentialRejected = false;
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
    if (!(await isRefreshCurrent())) throw new SessionChangedError();
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

function failureMessage(error: unknown): string {
  const message = getApiErrorMessage(error);
  if (typeof message === 'string' && message.trim()) return message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'No se pudo renovar la sesión.';
}

/**
 * Canjea la credencial de larga duración del dispositivo por una sesión nueva.
 * No requiere contraseña ni interacción del usuario, de modo que el cliente
 * puede renovarse en segundo plano en cuanto vuelve la conectividad.
 */
async function exchangeDeviceToken(
  isCurrent: () => Promise<boolean>,
): Promise<RenewOutcome> {
  const deviceToken = await getDeviceToken();
  if (!deviceToken)
    return {
      ok: false,
      kind: 'session-expired',
      message: 'No hay una credencial de dispositivo para renovar la sesión.',
    };

  try {
    const response = await api.post('/Token/DeviceToken/Exchange', {
      DeviceToken: deviceToken,
    });
    const envelope = AuthResponseSchema.parse(response.data);
    if (!envelope.Succeeded || !envelope.Data)
      throw new Error(envelope.Message || 'No se pudo renovar la sesión.');
    await enqueuePersistence(authGeneration, isCurrent, async () => {
      await persistTokens(response);
      await persistSession(envelope.Data!);
    });
    await initCsrf(isCurrent);
    return { ok: true, session: envelope.Data };
  } catch (error) {
    // Un cambio de cuenta durante el canje no es un fallo de credencial.
    if (error instanceof SessionChangedError) throw error;
    const kind = await classifyAuthFailure(error);
    return { ok: false, kind, message: failureMessage(error) };
  }
}

/**
 * Consulta al servidor el estado real de la sesión y de la cuenta. Es la única
 * fuente que permite distinguir "la sesión expiró" de "la cuenta fue
 * desactivada", porque ambas respuestas llegan como 401.
 */
async function querySessionStatus(): Promise<AuthFailureKind> {
  try {
    const refreshToken = await getRefreshToken();
    const deviceToken = await getDeviceToken();
    const response = await api.post('/Token/Session/Status', {
      RefreshToken: refreshToken ?? '',
      DeviceToken: deviceToken ?? '',
    });
    const envelope = SessionStatusResponseSchema.parse(response.data);
    if (!envelope.Succeeded || !envelope.Data) return 'unknown';
    switch (envelope.Data.Reason) {
      case 'account-disabled':
        return 'account-disabled';
      case 'account-expired':
        return 'account-expired';
      case 'device-revoked':
        return 'device-revoked';
      case 'device-expired':
        return 'device-expired';
      case 'session-expired':
        return 'session-expired';
      default:
        return 'session-expired';
    }
  } catch {
    return 'unknown';
  }
}

/**
 * Traduce un fallo de red o de autenticación a un motivo accionable.
 * Un 4xx nunca significa "cierra la sesión": solo significa "esta credencial
 * del servidor no sirve".
 */
export async function classifyAuthFailure(
  error: unknown,
): Promise<AuthFailureKind> {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!isAxiosError(cause)) return 'unknown';
  const status = cause.response?.status;
  if (!status) return 'offline';
  if (status >= 500) return 'server-error';
  if (status === 429) return 'rate-limited';
  if (status === 401 || status === 403) return querySessionStatus();
  return 'unknown';
}

/**
 * Renueva la credencial del servidor sin perder nunca la confianza local.
 *
 * La cadena es: access token vigente → refresh token → credencial de
 * dispositivo. Solo si las tres fallan se devuelve un error, y ese error nunca
 * invalida la sesión guardada en el dispositivo.
 */
export async function renewServerCredential(options?: {
  isCurrent?: () => Promise<boolean>;
}): Promise<RenewOutcome> {
  const isCurrent = options?.isCurrent ?? (async () => true);

  const stored = await getStoredSession();
  if (!credentialRejected && stored && !isSessionExpired(stored)) {
    const accessToken = await getAccessToken();
    if (accessToken) return { ok: true, session: stored };
  }

  try {
    // La clave de renovación se deriva de la sesión y no del llamador: así
    // el arranque, el interceptor de 401 y la sincronización comparten un
    // único vuelo. Con dos renovaciones simultáneas, la segunda usaría un
    // refresh token que la primera ya rotó y fallaría con 401.
    const session = await refreshSession(
      isCurrent,
      `session:${stored?.SsnID ?? 'default'}`,
    );
    credentialRejected = false;
    reportSyncTelemetry({ event: 'credential_renewed' });
    return { ok: true, session };
  } catch (error) {
    // Un cambio de cuenta no es un fallo de credencial: se propaga sin
    // intentar la vía de recuperación.
    if (error instanceof SessionChangedError) throw error;
    const kind = await classifyAuthFailure(error);
    if (
      kind === 'offline' ||
      kind === 'server-error' ||
      kind === 'rate-limited'
    ) {
      // Un fallo de red no invalida la credencial: solo impide renovarla.
      return { ok: false, kind, message: failureMessage(error) };
    }

    // La credencial del servidor no sirve: se intenta la credencial de
    // dispositivo, que es la vía prevista para recuperar la sesión sin
    // contraseña.
    const exchanged = await exchangeDeviceToken(isCurrent);
    if (exchanged.ok) {
      credentialRejected = false;
      reportSyncTelemetry({ event: 'credential_renewed' });
      return exchanged;
    }
    credentialRejected = true;
    // Si el refresh affirmation una razón más específica (cuenta desactivada o
    // credencial revocada), esa es la que gobierna.
    if (
      kind === 'account-disabled' ||
      kind === 'account-expired' ||
      kind === 'device-revoked'
    )
      return { ok: false, kind, message: failureMessage(error) };
    return exchanged;
  }
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
  credentialRejected = false;
  await enqueuePersistence(
    generation,
    async () => isCurrentGeneration(generation),
    async () =>
      Promise.all([
        storage.removeItem(SESSION_KEY),
        clearAccessToken(),
        clearRefreshToken(),
        clearDeviceToken(),
      ]),
  );
}

export async function clearLocalSession(): Promise<void> {
  await clearSessionAtGeneration(++authGeneration);
}

export function invalidateAuthOperations(): number {
  return ++authGeneration;
}

export async function logoutSession(): Promise<void> {
  const generation = invalidateAuthOperations();
  const deviceToken = await getDeviceToken();
  try {
    await api.post(
      '/Token/Logout',
      deviceToken ? { DeviceToken: deviceToken } : {},
    );
  } catch {
    // Local logout must still complete while offline or after token expiration.
  } finally {
    if (deviceToken) {
      try {
        // Best effort: revokes the long-lived credential so a lost device
        // cannot recover a session even without a live access token.
        await api.post('/Token/DeviceToken/Revoke', {
          DeviceToken: deviceToken,
        });
      } catch {
        // The local session is cleared regardless.
      }
    }
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
