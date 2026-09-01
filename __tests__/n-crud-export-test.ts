import {
  buildNCrudCsv,
  rowsForNCrudExport,
} from '@/components/crud/n-crud-export';
import type { NCrudColumn, NCrudRow } from '@/components/crud/contracts';

interface TestRow extends NCrudRow {
  Code: string;
  Description: string;
  Amount: number;
  Internal: string;
}

const rows: TestRow[] = [
  {
    id: '1',
    syncStatus: 'synced',
    Code: 'A;1',
    Description: 'Texto con "comillas"',
    Amount: 12.5,
    Internal: 'oculto',
  },
  {
    id: '2',
    syncStatus: 'updated',
    Code: 'B',
    Description: 'Segunda\nlínea',
    Amount: 0,
    Internal: 'oculto',
  },
];

const columns: NCrudColumn<TestRow>[] = [
  { key: 'Code', title: 'Código' },
  { key: 'Description', title: 'Descripción' },
  {
    key: 'Amount',
    title: 'Importe',
    exportFormat: (row) => row.Amount.toFixed(2),
  },
  { key: 'Internal', title: 'Interno', exportable: false },
];

describe('NCrud export', () => {
  it('genera CSV UTF-8 compatible con Excel y escapa valores', () => {
    const csv = buildNCrudCsv(rows, columns);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Código;Descripción;Importe');
    expect(csv).toContain('"A;1";"Texto con ""comillas""";12.50');
    expect(csv).toContain('B;"Segunda\nlínea";0.00');
    expect(csv).not.toContain('Interno');
    expect(csv).not.toContain('oculto');
  });

  it('exporta seleccionados cuando existen y todos los filtrados en caso contrario', () => {
    expect(rowsForNCrudExport(rows, [rows[1]])).toEqual([rows[1]]);
    expect(rowsForNCrudExport(rows, [])).toEqual(rows);
  });
});
