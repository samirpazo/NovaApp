import {
  initialNCrudFormState,
  nCrudFormReducer,
} from '@/components/crud/n-crud-form-state';

const row = { id: 'local-1', syncStatus: 'synced' as const };

describe('NCrud form lifecycle', () => {
  it('opens create mode without a selected row', () => {
    const state = nCrudFormReducer(initialNCrudFormState, {
      type: 'open-add',
    });

    expect(state).toEqual({ mode: 'add', row: null, pending: false });
  });

  it('opens edit mode with the requested row', () => {
    const state = nCrudFormReducer(initialNCrudFormState, {
      type: 'open-edit',
      row,
    });

    expect(state).toEqual({ mode: 'edit', row, pending: false });
  });

  it('does not close while a submission is pending', () => {
    const editing = nCrudFormReducer(initialNCrudFormState, {
      type: 'open-edit',
      row,
    });
    const pending = nCrudFormReducer(editing, { type: 'submit-start' });

    expect(nCrudFormReducer(pending, { type: 'close' })).toBe(pending);
  });

  it('returns to the list after a successful submission', () => {
    const adding = nCrudFormReducer(initialNCrudFormState, {
      type: 'open-add',
    });
    const pending = nCrudFormReducer(adding, { type: 'submit-start' });

    expect(nCrudFormReducer(pending, { type: 'submit-success' })).toEqual(
      initialNCrudFormState,
    );
  });
});
