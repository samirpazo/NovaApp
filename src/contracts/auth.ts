import { createResponseApiSchema } from '@/contracts/api';
import { z } from 'zod';

const expirationSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'La fecha de expiración de la sesión no es válida.',
  );

/**
 * Datos del usuario que la app conserva tras autenticarse.
 *
 * Es una lista permitida: Zod descarta cualquier campo adicional que NovaApi
 * envíe. Ampliarla exige una necesidad funcional explícita, y solo con datos
 * que el trabajo en campo necesita.
 *
 * El backend ya envía en el login (`SecUserCe`, función `SecUser_ByUsrName`)
 * los datos de la persona vinculada al usuario. Aquí se admiten los que
 * identifican y contactan al responsable de una visita, y se descartan
 * deliberadamente los sensibles: dirección, documento de identidad, grupo
 * sanguíneo, contacto de emergencia, condiciones médicas y RUC, así como los
 * datos laborales del acuerdo (tipo de pago, situación y contrato).
 */
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
  // Identificación de la persona.
  PrsDocumentNumber: z.string().nullish(),
  TypeDocument: z.number().int().nullish(),
  TypeDocumentName: z.string().nullish(),
  // Contacto.
  PrsPhone: z.string().nullish(),
  // Ubicación administrativa.
  DptName: z.string().nullish(),
  PrvName: z.string().nullish(),
  DtrName: z.string().nullish(),
  PaiName: z.string().nullish(),
  AreName: z.string().nullish(),
  PstName: z.string().nullish(),
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
