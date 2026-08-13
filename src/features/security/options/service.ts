import { createResponseApiSchema } from '@/contracts/api';
import { SecOptionSchema, type SecOption } from '@/contracts/security/SecOption';
import { database } from '@/database';
import { api } from '@/lib/api';
import { z } from 'zod';

const CACHE_PREFIX = 'nova.security.mobile-options';

function cacheKey(userId: number): string {
  return `${CACHE_PREFIX}:${userId}`;
}

export async function refreshMobileOptions(userId: number): Promise<SecOption[]> {
  const response = await api.get('/SecUser/MyOptions', {
    params: { mobileOnly: true },
  });
  const envelope = createResponseApiSchema(z.array(SecOptionSchema)).parse(response.data);
  if (!envelope.Succeeded || !envelope.Data) {
    throw new Error(envelope.Message || 'Nova no devolvió las opciones móviles.');
  }
  await database.localStorage.set(cacheKey(userId), envelope.Data);
  return envelope.Data;
}

export async function getCachedMobileOptions(userId: number): Promise<SecOption[]> {
  const userCached = await database.localStorage.get<unknown>(cacheKey(userId));
  const userParsed = z.array(SecOptionSchema).safeParse(userCached);
  return userParsed.success ? userParsed.data : [];
}
