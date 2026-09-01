import type { NCrudFormState, NCrudRow } from '@/components/crud/contracts';

export const initialNCrudFormState: NCrudFormState = {
  mode: 'closed',
  row: null,
  pending: false,
};

export type NCrudFormAction<T extends NCrudRow = NCrudRow> =
  | { type: 'open-add' }
  | { type: 'open-edit'; row: T }
  | { type: 'close' }
  | { type: 'submit-start' }
  | { type: 'submit-error' }
  | { type: 'submit-success' };

export function nCrudFormReducer<T extends NCrudRow>(
  state: NCrudFormState<T>,
  action: NCrudFormAction<T>,
): NCrudFormState<T> {
  if (action.type === 'open-add')
    return { mode: 'add', row: null, pending: false };
  if (action.type === 'open-edit')
    return { mode: 'edit', row: action.row, pending: false };
  if (action.type === 'close')
    return state.pending
      ? state
      : { mode: 'closed', row: null, pending: false };
  if (action.type === 'submit-start') return { ...state, pending: true };
  if (action.type === 'submit-error') return { ...state, pending: false };
  return { mode: 'closed', row: null, pending: false };
}
