import { localStorageKey } from '@nozbe/watermelondb';
import { getActiveDatabase, getActiveIdentityKey } from '@/database';
import { getForUser } from '@/lib/api';
import { useAuthStore } from '@/auth/store';

/** GenFiles is immutable; cache an authenticated image in the current local database scope. */
export async function loadManagedImage(fileId: number): Promise<string> {
  if (!Number.isInteger(fileId) || fileId <= 0) throw new Error('El archivo debe tener un identificador válido.');
  const database = getActiveDatabase();
  const identityKey = getActiveIdentityKey();
  const userId = useAuthStore.getState().Session?.User.UsrID;
  if (!userId) throw new Error('Debe iniciar sesión para descargar el archivo.');
  const cacheKey = localStorageKey<string>(`nova.managedImage.${fileId}`);
  const cached = await database.localStorage.get<string>(cacheKey);
  if (cached) return cached;
  const response = await getForUser<ArrayBuffer>(`/GenFiles/${fileId}/preview`, userId, {
    responseType: 'arraybuffer',
  }, identityKey ?? undefined);
  const contentType = String(response.headers['content-type'] ?? '').split(';')[0];
  if (!contentType.startsWith('image/'))
    throw new Error('El archivo no tiene una vista previa de imagen.');
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const source = `data:${contentType};base64,${btoa(binary)}`;
  if (
    useAuthStore.getState().Session?.User.UsrID !== userId ||
    getActiveIdentityKey() !== identityKey
  )
    throw new Error('La sesión cambió durante la descarga del archivo.');
  await database.localStorage.set(cacheKey, source);
  return source;
}
