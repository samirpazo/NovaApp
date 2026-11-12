import { createResponseApiSchema } from '@/contracts/api';
import { z } from 'zod';

const expirationSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'La fecha de expiración de la sesión no es válida.',
  );

export const AuthUserSchema = z.object({
  UsrID: z.number().int().positive(),
  UsrName: z.string().min(1),
  UsrEmail: z.string().nullish(),
  FullName: z.string().nullish(),
  PrsName: z.string().nullish(),
  PaternalLastName: z.string().nullish(),
  MaternalLastName: z.string().nullish(),
  PrsID: z.number().int().nullish(),
  UsrChangePassword: z.boolean().nullish(),
});

/**
 * Estado de la credencial del servidor. Es una caché, no la identidad del
 * usuario: puede quedar `rejected` sin que el dispositivo pierda el acceso a
 * los datos locales.
 */
export const CredentialStateSchema = z.enum([
  'valid',
  'stale',
  'rejected',
  'unknown',
]);

export type CredentialState = z.infer<typeof CredentialStateSchema>;

/**
 * Documento de sesión que vive en el dispositivo.
 *
 * `LocalTrustSince` marca desde cuándo el dispositivo confía en la cuenta: esa
 * confianza no caduca por tiempo. `AccessTokenExpiration` describe únicamente
 * la vigencia del token del servidor.
 */
export const AuthSessionSchema = z.object({
  AccessTokenExpiration: expirationSchema,
  SsnID: z.number().int().positive(),
  User: AuthUserSchema,
  LocalTrustSince: z.string().nullish(),
  CredentialState: CredentialStateSchema.nullish(),
  CredentialReason: z.string().nullish(),
});

export const AuthResponseSchema = createResponseApiSchema(
  AuthSessionSchema.extend({
    DeviceToken: z.string().nullish(),
    DeviceTokenExpiration: expirationSchema.nullish(),
  }),
);

/**
 * Estado que afirma el servidor sobre la sesión y la cuenta. Permite
 * distinguir "no hay red" de "la sesión expiró" y de "la cuenta ya no está
 * habilitada" sin depender de los mensajes de error.
 */
export const SessionStatusSchema = z.object({
  Reason: z.string(),
  AccountActive: z.boolean(),
  SessionValid: z.boolean(),
  DeviceCredentialValid: z.boolean(),
  AccountExpiresAt: z.string().nullish(),
  SsnID: z.number().int().optional(),
  UsrID: z.number().int().optional(),
});

export const SessionStatusResponseSchema =
  createResponseApiSchema(SessionStatusSchema);

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
