import type {
  NCrudColumn,
  NCrudColumnVisibility,
  NCrudRow,
  NCrudSelectionMode,
} from '@/components/crud/contracts';

export function toggleNCrudRowSelection<T extends NCrudRow>(
  selectedRows: T[],
  row: T,
  mode: NCrudSelectionMode,
): T[] {
  if (mode === 'none') return selectedRows;
  const selected = selectedRows.some((item) => item.id === row.id);
  if (mode === 'single') return selected ? [] : [row];
  return selected
    ? selectedRows.filter((item) => item.id !== row.id)
    : [...selectedRows, row];
}

export function toggleNCrudVisibleSelection<T extends NCrudRow>(
  selectedRows: T[],
  visibleRows: T[],
): T[] {
  const allVisibleSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) =>
      selectedRows.some((selected) => selected.id === row.id),
    );
  if (allVisibleSelected)
    return selectedRows.filter(
      (selected) => !visibleRows.some((row) => row.id === selected.id),
    );
  const selectedIds = new Set(selectedRows.map((row) => row.id));
  return [
    ...selectedRows,
    ...visibleRows.filter((row) => !selectedIds.has(row.id)),
  ];
}

export function getNCrudVisibleColumns<T extends NCrudRow>(
  columns: NCrudColumn<T>[],
  visibility: NCrudColumnVisibility<T>,
  compact: boolean,
): NCrudColumn<T>[] {
  return columns.filter((column) => {
    const override = visibility[column.key];
    if (override != null) return override;
    if (column.hidden) return false;
    return !(compact && column.mobileHidden);
  });
}

export function paginateNCrudRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): T[] {
  if (pageSize === -1) return rows;
  const safePage = Math.max(1, page);
  return rows.slice((safePage - 1) * pageSize, safePage * pageSize);
}
