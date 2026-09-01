import {
  getNCrudVisibleColumns,
  paginateNCrudRows,
  toggleNCrudRowSelection,
  toggleNCrudVisibleSelection,
} from '@/components/crud/n-crud-table-state';
import type { NCrudColumn, NCrudRow } from '@/components/crud/contracts';

interface Row extends NCrudRow {
  name: string;
  secret: string;
}

const first: Row = {
  id: 'first',
  syncStatus: 'synced',
  name: 'Primero',
  secret: 'A',
};
const second: Row = {
  id: 'second',
  syncStatus: 'updated',
  name: 'Segundo',
  secret: 'B',
};

describe('NCrud table state', () => {
  it('keeps selections from other pages when selecting a visible row', () => {
    expect(toggleNCrudRowSelection([first], second, 'multiple')).toEqual([
      first,
      second,
    ]);
  });

  it('replaces the previous row in single-selection mode', () => {
    expect(toggleNCrudRowSelection([first], second, 'single')).toEqual([
      second,
    ]);
  });

  it('selects and deselects only the rows visible on the current page', () => {
    const hiddenPageRow = { ...first, id: 'hidden' };
    const selected = toggleNCrudVisibleSelection(
      [hiddenPageRow],
      [first, second],
    );

    expect(selected).toEqual([hiddenPageRow, first, second]);
    expect(toggleNCrudVisibleSelection(selected, [first, second])).toEqual([
      hiddenPageRow,
    ]);
  });

  it('applies default and user-defined column visibility', () => {
    const columns: NCrudColumn<Row>[] = [
      { key: 'name', title: 'Nombre' },
      { key: 'secret', title: 'Secreto', hidden: true },
    ];

    expect(getNCrudVisibleColumns(columns, {}, false)).toEqual([columns[0]]);
    expect(getNCrudVisibleColumns(columns, { secret: true }, false)).toEqual(
      columns,
    );
  });

  it('hides mobile-only columns without changing desktop visibility', () => {
    const columns: NCrudColumn<Row>[] = [
      { key: 'name', title: 'Nombre' },
      { key: 'secret', title: 'Secreto', mobileHidden: true },
    ];

    expect(getNCrudVisibleColumns(columns, {}, true)).toEqual([columns[0]]);
    expect(getNCrudVisibleColumns(columns, {}, false)).toEqual(columns);
  });

  it('returns every row when page size is Todos', () => {
    expect(paginateNCrudRows([first, second], 1, -1)).toEqual([first, second]);
  });

  it('returns only the requested local page', () => {
    expect(paginateNCrudRows([first, second], 2, 1)).toEqual([second]);
  });
});
