import { Platform } from 'react-native';
import { z } from 'zod';

import { createResponseApiSchema } from '@/contracts/api';
import { API_URL, postForUser } from '@/lib/api';
import { getActiveIdentityKey } from '@/database';

const ManagedFileSchema = z.object({
  FileId: z.number().int(),
  OriginalName: z.string(),
  MimeType: z.string(),
  Size: z.number().int(),
  PreviewStatus: z.string(),
  CanDownload: z.boolean(),
});

export type ManagedFile = z.infer<typeof ManagedFileSchema>;

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: File;
}

export async function uploadManagedFile(
  file: PickedFile,
  genParameter: string,
  uploadId: string | undefined,
  userId: number,
  identityKey = getActiveIdentityKey() ?? undefined,
): Promise<ManagedFile> {
  if (!genParameter.trim()) throw new Error('genParameter es obligatorio.');

  const form = new FormData();
  form.append('genParameter', genParameter.trim());
  // Identificador estable de la carga. El servidor lo usa para devolver el
  // archivo ya guardado cuando el cliente reintenta una carga cuya respuesta
  // se perdió. No se envía la cabecera Idempotency-Key porque su huella
  // depende del cuerpo multipart, que cambia entre reintentos y provocaría
  // un conflicto en lugar de deduplicar.
  if (uploadId?.trim()) form.append('uploadId', uploadId.trim());
  if (Platform.OS === 'web' && file.file) form.append('file', file.file);
  else
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    } as never);

  const requestConfig = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  const response = await postForUser(
    '/GenFiles/upload',
    form,
    userId,
    requestConfig,
    identityKey,
  );
  const envelope = createResponseApiSchema(ManagedFileSchema).parse(
    response.data,
  );
  if (!envelope.Succeeded || !envelope.Data)
    throw new Error(
      envelope.Message || 'Nova no confirmó la carga del archivo.',
    );
  return envelope.Data;
}

export function managedFilePreviewUrl(fileId: number): string {
  return `${API_URL}/GenFiles/${fileId}/preview`;
}
