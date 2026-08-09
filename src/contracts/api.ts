export type ValidationErrors = string[] | Record<string, string[]>;

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
