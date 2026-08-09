import { z } from 'zod';

export type ValidationErrors = string[] | Record<string, string[]>;

export const ValidationErrorsSchema = z.union([
  z.array(z.string()),
  z.record(z.string(), z.array(z.string())),
]);

export function createResponseApiSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.object({
    Succeeded: z.boolean(),
    Message: z.string().nullable(),
    Errors: ValidationErrorsSchema.nullish(),
    Data: dataSchema.nullable(),
  });
}

export interface ResponseApi<T> {
  Succeeded: boolean;
  Message: string | null;
  Errors?: ValidationErrors | null;
  Data: T | null;
}

export interface PagedResult<T> {
  Data: T[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

export interface PaginationRequest<TFilter extends object = Record<string, unknown>> {
  Page: number;
  PageSize: number;
  Filter?: TFilter;
  IsLevelAdmin?: number;
  SearchText?: string;
  OrderBy?: string | null;
  SortOrder?: 'asc' | 'desc' | null;
}
