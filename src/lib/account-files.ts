import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getActiveIdentityKey } from '@/database';
import type { PickedFile } from '@/lib/fileService';

function extensionFor(mimeType: string | null | undefined): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/heic') return '.heic';
  return '.jpg';
}

export async function toAccountDataUri(
  file: PickedFile,
): Promise<PickedFile & Record<string, unknown>> {
  if (file.uri.startsWith('data:'))
    return { uri: file.uri, name: file.name, mimeType: file.mimeType };
  if (!file.file && !file.uri.startsWith('blob:'))
    throw new Error('No se pudo conservar localmente el archivo seleccionado.');
  const blob = file.file ?? (await (await fetch(file.uri)).blob());
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const mimeType = file.mimeType || blob.type || 'application/octet-stream';
  return {
    uri: `data:${mimeType};base64,${btoa(binary)}`,
    name: file.name,
    mimeType,
  };
}

/** Keeps offline evidence in storage owned by the current account. */
export async function persistAccountFile(
  file: PickedFile,
  identityKey = getActiveIdentityKey(),
): Promise<PickedFile & Record<string, unknown>> {
  if (Platform.OS === 'web')
    return toAccountDataUri(file);
  if (!identityKey)
    throw new Error('No hay una cuenta activa para guardar este archivo.');
  const directory = new Directory(Paths.document, 'nova-app', identityKey);
  directory.create({ intermediates: true, idempotent: true });
  const source = new File(file.uri);
  const destination = new File(
    directory,
    `${randomUUID()}${extensionFor(file.mimeType)}`,
  );
  if (file.uri.startsWith('data:')) {
    const encoded = file.uri.match(/^data:[^,]*;base64,(.*)$/)?.[1];
    if (!encoded) throw new Error('La firma local tiene un formato inválido.');
    destination.create({ intermediates: true, overwrite: false });
    destination.write(encoded, { encoding: 'base64' });
  } else {
    new File(file.uri).copy(destination);
  }
  return { ...file, uri: destination.uri };
}
