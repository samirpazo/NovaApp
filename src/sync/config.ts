import { storage } from '@/lib/storage';
import { z } from 'zod';

const CONNECTION_KEY = 'nova.sync.connection';
const ACCESS_TOKEN_KEY = 'nova.auth.accessToken';

export const SyncConnectionSchema = z.object({
  BaseUrl: z.string().url(),
  BranchId: z.number().int().positive().optional(),
});

export type SyncConnection = z.infer<typeof SyncConnectionSchema>;

export async function getSyncConnection(): Promise<SyncConnection | null> {
  const value = await storage.getItem(CONNECTION_KEY);
  if (!value) return null;
  try {
    const parsed = SyncConnectionSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveSyncConnection(connection: SyncConnection): Promise<void> {
  const validConnection = SyncConnectionSchema.parse({
    ...connection,
    BaseUrl: connection.BaseUrl.replace(/\/+$/, ''),
  });
  await storage.setItem(CONNECTION_KEY, JSON.stringify(validConnection));
}

export async function getAccessToken(): Promise<string | null> {
  return storage.getItem(ACCESS_TOKEN_KEY);
}

export async function saveAccessToken(accessToken: string): Promise<void> {
  const token = accessToken.trim();
  if (!token) throw new Error('El token de acceso no puede estar vacío.');
  await storage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await storage.removeItem(ACCESS_TOKEN_KEY);
}
