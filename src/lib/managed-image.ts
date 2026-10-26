import { localStorageKey } from '@nozbe/watermelondb';
import { database } from '@/database';
import { api } from '@/lib/api';

/** GenFiles is immutable; cache an authenticated image in the current local database scope. */
export async function loadManagedImage(fileId: number): Promise<string> {
  if (!Number.isInteger(fileId) || fileId <= 0) throw new Error('El archivo debe tener un identificador válido.');
  const cacheKey = localStorageKey<string>(`nova.managedImage.${fileId}`);
  const cached = await database.localStorage.get<string>(cacheKey);
  if (cached) return cached;
  const response = await api.get<ArrayBuffer>(`/GenFiles/${fileId}/preview`, {
    responseType: 'arraybuffer',
  });
  const contentType = String(response.headers['content-type'] ?? '').split(';')[0];
  if (!contentType.startsWith('image/'))
    throw new Error('El archivo no tiene una vista previa de imagen.');
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const source = `data:${contentType};base64,${btoa(binary)}`;
  await database.localStorage.set(cacheKey, source);
  return source;
}
