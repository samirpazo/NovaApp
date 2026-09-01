import {
  isNCrudActionDisabled,
  isNCrudActionVisible,
} from '@/components/crud/n-crud-actions';
import type { NCrudAction, NCrudRow } from '@/components/crud/contracts';

const rows: NCrudRow[] = [
  { id: 'one', syncStatus: 'synced' },
  { id: 'two', syncStatus: 'updated' },
];

const action = (
  values: Partial<NCrudActionForTest> = {},
): NCrudAction<NCrudRowForTest> => ({
  id: 'action',
  label: 'Acción',
  kind: 'custom',
  onPress: () => undefined,
  ...values,
});

type NCrudRowForTest = NCrudRow;
type NCrudActionForTest = NCrudAction<NCrudRowForTest>;

describe('NCrud toolbar actions', () => {
  it('hides actions when the user lacks permission', () => {
    expect(isNCrudActionVisible(action({ permission: false }), rows)).toBe(
      false,
    );
  });

  it('hides bulk actions until at least one row is selected', () => {
    const bulk = action({ placement: 'bulk' });

    expect(isNCrudActionVisible(bulk, [])).toBe(false);
    expect(isNCrudActionVisible(bulk, rows)).toBe(true);
  });

  it('disables an action outside its selection range', () => {
    const exactlyOne = action({ minSelection: 1, maxSelection: 1 });

    expect(isNCrudActionDisabled(exactlyOne, [])).toBe(true);
    expect(isNCrudActionDisabled(exactlyOne, [rows[0]])).toBe(false);
    expect(isNCrudActionDisabled(exactlyOne, rows)).toBe(true);
  });

  it('disables every action while another action is executing', () => {
    expect(isNCrudActionDisabled(action(), rows, true)).toBe(true);
  });
});
