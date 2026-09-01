import { z } from 'zod';

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// System.Guid accepts all 128-bit values; RFC UUID validation is stricter about
// version and variant bits and rejects SQL Server sequential GUIDs already in Nova.
export const GuidSchema = z
  .string()
  .regex(GUID_PATTERN, 'GUID inválido')
  .transform((value) => value.toLowerCase());

export const nullableStringSchema = z
  .string()
  .nullish()
  .transform((value) => value ?? null);
export const nullableIntegerSchema = z
  .number()
  .int()
  .nullish()
  .transform((value) => value ?? null);
