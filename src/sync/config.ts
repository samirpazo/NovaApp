import { storage } from '@/lib/storage';
import { Platform } from 'react-native';
import { z } from 'zod';

const CONNECTION_KEY = 'nova.sync.connection';
const ACCESS_TOKEN_KEY = 'nova.auth.accessToken';
const REFRESH_TOKEN_KEY = 'nova.auth.refreshToken';
const DEVICE_TOKEN_KEY = 'nova.auth.deviceToken';

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function isConfiguredApiConnection(connection: SyncConnection): boolean {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  return !!configuredUrl &&
    normalizeBaseUrl(connection.BaseUrl) === normalizeBaseUrl(configuredUrl);
}

export const SyncConnectionSchema = z.object({
  BaseUrl: z.string().url(),
  BranchId: z.number().int().positive().optional(),
});

export type SyncConnection = z.infer<typeof SyncConnectionSchema>;

export function getEnvironmentSyncConnection(): SyncConnection {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL no está configurado.');
  return SyncConnectionSchema.parse({ BaseUrl: baseUrl.replace(/\/+$/, '') });
}

export async function getSyncConnection(): Promise<SyncConnection | null> {
  const value = await storage.getItem(CONNECTION_KEY);
  if (!value) return getEnvironmentSyncConnection();
  try {
    const parsed = SyncConnectionSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : getEnvironmentSyncConnection();
  } catch {
    return getEnvironmentSyncConnection();
  }
}

export async function saveSyncConnection(
  connection: SyncConnection,
): Promise<void> {
  const validConnection = SyncConnectionSchema.parse({
    ...connection,
    BaseUrl: connection.BaseUrl.replace(/\/+$/, ''),
  });
  await storage.setItem(CONNECTION_KEY, JSON.stringify(validConnection));
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return storage.getItem(ACCESS_TOKEN_KEY);
}

export async function saveAccessToken(accessToken: string): Promise<void> {
  if (Platform.OS === 'web')
    throw new Error('Los tokens web deben permanecer en cookies HttpOnly.');
  const token = accessToken.trim();
  if (!token) throw new Error('El token de acceso no puede estar vacío.');
  await storage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await storage.removeItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return storage.getItem(REFRESH_TOKEN_KEY);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  if (Platform.OS === 'web')
    throw new Error('Los tokens web deben permanecer en cookies HttpOnly.');
  await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearRefreshToken(): Promise<void> {
  await storage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Credencial de larga duración del dispositivo. Permite recuperar una sesión
 * sin contraseña ni interacción del usuario tras un periodo largo sin conexión.
 *
 * En web no se usa: el navegador mantiene el refresh token en una cookie
 * HttpOnly y el backend ya le aplica la ventana larga de Nova App.
 */
export async function getDeviceToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return storage.getItem(DEVICE_TOKEN_KEY);
}

export async function saveDeviceToken(deviceToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = deviceToken.trim();
  if (!token) throw new Error('La credencial de dispositivo no puede estar vacía.');
  await storage.setItem(DEVICE_TOKEN_KEY, token);
}

export async function clearDeviceToken(): Promise<void> {
  await storage.removeItem(DEVICE_TOKEN_KEY);
}
