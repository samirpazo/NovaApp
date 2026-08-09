import { createResponseApiSchema } from '@/contracts/api';
import { z } from 'zod';

export const AuthUserSchema = z.object({
  UsrID: z.number().int(),
  UsrName: z.string(),
  UsrEmail: z.string().nullish(),
  FullName: z.string().nullish(),
  PrsName: z.string().nullish(),
  PaternalLastName: z.string().nullish(),
  MaternalLastName: z.string().nullish(),
  PrsPhoto: z.string().nullish(),
  PrsID: z.number().int().nullish(),
  UsrChangePassword: z.boolean().nullish(),
});

export const AuthSessionSchema = z.object({
  AccessTokenExpiration: z.string(),
  SsnID: z.number().int(),
  User: AuthUserSchema,
});

export const AuthResponseSchema = createResponseApiSchema(AuthSessionSchema);
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
