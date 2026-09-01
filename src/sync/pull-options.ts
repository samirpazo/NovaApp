/**
 * WatermelonDB stores the backend cursor offset by one. A complete download
 * deliberately omits it so NovaApi returns its current bootstrap snapshot.
 */
export function initialPullCursor(
  lastPulledAt: number | undefined,
  forceBootstrap: boolean,
): number | undefined {
  if (forceBootstrap || lastPulledAt == null) return undefined;
  return lastPulledAt - 1;
}
