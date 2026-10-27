import { createResponseApiSchema } from '@/contracts/api';
import {
  SecOptionSchema,
  type SecOption,
} from '@/contracts/security/SecOption';
import { getActiveDatabase, getActiveIdentityKey } from '@/database';
import { getForUser } from '@/lib/api';
import { z } from 'zod';

const CACHE_PREFIX = 'nova.security.mobile-options';

function cacheKey(userId: number): string {
  return `${CACHE_PREFIX}:${userId}`;
}

export async function refreshMobileOptions(
  userId: number,
): Promise<SecOption[]> {
  const database = getActiveDatabase();
  const identityKey = getActiveIdentityKey();
  const response = await getForUser('/SecUser/MyOptions', userId, {
    params: { mobileOnly: true },
  }, identityKey ?? undefined);
  const envelope = createResponseApiSchema(z.array(SecOptionSchema)).parse(
    response.data,
  );
  if (!envelope.Succeeded || !envelope.Data) {
    throw new Error(
      envelope.Message || 'Nova no devolvió las opciones móviles.',
    );
  }
  await database.localStorage.set(cacheKey(userId), envelope.Data);
  return envelope.Data;
}

export async function getCachedMobileOptions(
  userId: number,
): Promise<SecOption[]> {
  const database = getActiveDatabase();
  const userCached = await database.localStorage.get<unknown>(cacheKey(userId));
  const userParsed = z.array(SecOptionSchema).safeParse(userCached);
  return userParsed.success ? userParsed.data : [];
}
