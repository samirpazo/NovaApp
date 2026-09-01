import type { NCrudAction, NCrudRow } from '@/components/crud/contracts';

export function isNCrudActionVisible<T extends NCrudRow>(
  action: NCrudAction<T>,
  rows: T[],
): boolean {
  if (action.permission === false || action.placement === 'row') return false;
  if (action.placement === 'bulk' && rows.length === 0) return false;
  return typeof action.visible === 'function'
    ? action.visible(rows)
    : action.visible !== false;
}

export function isNCrudActionDisabled<T extends NCrudRow>(
  action: NCrudAction<T>,
  rows: T[],
  busy = false,
): boolean {
  if (busy) return true;
  if (action.minSelection != null && rows.length < action.minSelection)
    return true;
  if (action.maxSelection != null && rows.length > action.maxSelection)
    return true;
  return typeof action.disabled === 'function'
    ? action.disabled(rows)
    : action.disabled === true;
}
