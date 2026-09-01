import { DateTime } from 'luxon';

import type { NCrudColumn, NCrudRow } from '@/components/crud/contracts';

const CSV_SEPARATOR = ';';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return text.includes(CSV_SEPARATOR) || /["\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

export function rowsForNCrudExport<T>(allRows: T[], selectedRows: T[]): T[] {
  return selectedRows.length ? selectedRows : allRows;
}

export function buildNCrudCsv<T extends NCrudRow>(
  rows: T[],
  columns: NCrudColumn<T>[],
): string {
  const exportColumns = columns.filter((column) => column.exportable !== false);
  const lines = [
    exportColumns.map((column) => csvCell(column.title)).join(CSV_SEPARATOR),
    ...rows.map((row) =>
      exportColumns
        .map((column) =>
          csvCell(
            column.exportFormat ? column.exportFormat(row) : row[column.key],
          ),
        )
        .join(CSV_SEPARATOR),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function createNCrudExportFileName(title: string): string {
  const safeTitle =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'datos';
  const timestamp = DateTime.now().toFormat('yyyyMMdd_HHmmss');
  return `${safeTitle}_${timestamp}.csv`;
}
