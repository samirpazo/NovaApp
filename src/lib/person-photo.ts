import { localStorageKey } from '@nozbe/watermelondb';

import { useAuthStore } from '@/auth/store';
import { getActiveDatabase, getActiveIdentityKey } from '@/database';
import { getForUser } from '@/lib/api';
import { loadManagedImage } from '@/lib/managed-image';
import { z } from 'zod';

const PersonPhotoSchema = z.object({
  FilID: z.number().int(),
  SecStatus: z.boolean().nullish(),
});

const PersonPhotoListSchema = z.array(PersonPhotoSchema);

const photoCacheKey = (key: string) =>
  localStorageKey<string>(`nova.personPhoto.${key}`);

async function toDataUri(response: {
  data: ArrayBuffer;
  headers?: Record<string, unknown>;
}): Promise<string> {
  const contentType = String(response.headers?.['content-type'] ?? '').split(
    ';',
  )[0];
  if (!contentType.startsWith('image/'))
    throw new Error('El archivo no es una imagen.');
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${contentType};base64,${btoa(binary)}`;
}

/**
 * Foto de la persona vinculada al usuario autenticado.
 *
 * `GET /GenPerson/MyPhoto` devuelve el archivo de la foto activa y no exige
 * permisos adicionales, a diferencia del historial de fotos. La imagen se
 * guarda en el almacenamiento local de la cuenta para que siga disponible
 * sin conexión.
 */
export async function loadMyProfilePhoto(): Promise<string | null> {
  const userId = useAuthStore.getState().Session?.User.UsrID;
  if (!userId) return null;

  const database = getActiveDatabase();
  const identityKey = getActiveIdentityKey();
  const cacheKey = photoCacheKey('me');
  const cached = await database.localStorage.get<string>(cacheKey);
  if (cached) return cached;

  try {
    const response = await getForUser<ArrayBuffer>(
      '/GenPerson/MyPhoto',
      userId,
      { responseType: 'arraybuffer' },
      identityKey ?? undefined,
    );
    const source = await toDataUri(response);
    if (
      useAuthStore.getState().Session?.User.UsrID !== userId ||
      getActiveIdentityKey() !== identityKey
    )
      throw new Error('La sesión cambió durante la descarga de la foto.');
    await database.localStorage.set(cacheKey, source);
    return source;
  } catch {
    // Sin foto, o sin permiso: el perfil sigue funcionando con las iniciales.
    return null;
  }
}

/**
 * Foto de cualquier persona, a partir del historial de fotos que expone
 * `GET /GenPerson/GetPhotoHistory/{prsId}`. Se toma la foto activa más
 * reciente y se sirve desde la caché de archivos administrados.
 */
export async function loadPersonPhoto(prsId: number): Promise<string | null> {
  const userId = useAuthStore.getState().Session?.User.UsrID;
  if (!userId || !Number.isInteger(prsId) || prsId <= 0) return null;

  const identityKey = getActiveIdentityKey();
  try {
    const response = await getForUser(
      `/GenPerson/GetPhotoHistory/${prsId}`,
      userId,
      {},
      identityKey ?? undefined,
    );
    const photos = PersonPhotoListSchema.parse(
      (response.data as { Data?: unknown })?.Data ?? [],
    );
    const current = photos.find((photo) => photo.SecStatus && photo.FilID > 0);
    if (!current) return null;
    return await loadManagedImage(current.FilID);
  } catch {
    return null;
  }
}
