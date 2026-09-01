import { storage } from '@/lib/storage';
import { Platform } from 'react-native';
import { z } from 'zod';

const CONNECTION_KEY = 'nova.sync.connection';
const ACCESS_TOKEN_KEY = 'nova.auth.accessToken';
const REFRESH_TOKEN_KEY = 'nova.auth.refreshToken';

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
