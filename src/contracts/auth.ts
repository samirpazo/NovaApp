import { createResponseApiSchema } from '@/contracts/api';
import { z } from 'zod';

const expirationSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'La fecha de expiración de la sesión no es válida.');

export const AuthUserSchema = z.object({
  UsrID: z.number().int().positive(),
  UsrName: z.string().min(1),
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
  AccessTokenExpiration: expirationSchema,
  SsnID: z.number().int().positive(),
  User: AuthUserSchema,
});

export const AuthResponseSchema = createResponseApiSchema(AuthSessionSchema);
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
