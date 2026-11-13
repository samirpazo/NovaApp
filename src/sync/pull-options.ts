/** Fetch journal deletions before refreshing the complete authorized snapshot. */
export function pullCursors(
  lastPulledAt: number | undefined,
  refreshSnapshot: boolean,
): (number | undefined)[] {
  if (lastPulledAt == null) return [undefined];
  return refreshSnapshot ? [lastPulledAt - 1, undefined] : [lastPulledAt - 1];
}
