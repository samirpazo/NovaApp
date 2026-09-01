import type { NCrudPersistedViewState } from '@/components/crud/contracts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const createNCrudViewStorageKey = (key: string) =>
  `nova_app_ncrud_view_${key}`;

export function parseNCrudViewState(
  value: string | null,
): NCrudPersistedViewState<Record<string, unknown>> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || !isRecord(parsed.request)) return null;
    const request = parsed.request;
    if (
      !Number.isInteger(request.Page) ||
      Number(request.Page) < 1 ||
      !Number.isInteger(request.PageSize) ||
      (Number(request.PageSize) < 1 && request.PageSize !== -1) ||
      typeof request.SearchText !== 'string' ||
      !isRecord(request.ColumnSearch) ||
      !Object.values(request.ColumnSearch).every(
        (item) => typeof item === 'string',
      ) ||
      (request.OrderBy !== null && typeof request.OrderBy !== 'string') ||
      ![null, 'asc', 'desc'].includes(request.SortOrder as string | null) ||
      !isRecord(request.Filter) ||
      !isRecord(parsed.columnVisibility) ||
      !Object.values(parsed.columnVisibility).every(
        (item) => typeof item === 'boolean',
      )
    )
      return null;
    return {
      request: request as unknown as NCrudPersistedViewState<
        Record<string, unknown>
      >['request'],
      columnVisibility: parsed.columnVisibility as Record<string, boolean>,
    };
  } catch {
    return null;
  }
}
