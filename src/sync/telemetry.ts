export type SyncFailureKind =
  'conflict' | 'network' | 'validation' | 'cancelled' | 'unknown';

export interface SyncTelemetryEvent {
  event: 'sync_completed' | 'sync_failed';
  durationMs: number;
  downloaded?: number;
  uploaded?: number;
  pages?: number;
  failureKind?: SyncFailureKind;
}

export function classifySyncFailure(message: string): SyncFailureKind {
  const value = message.toLowerCase();
  if (value.includes('conflict')) return 'conflict';
  if (value.includes('cancel')) return 'cancelled';
  if (
    value.includes('conexión') ||
    value.includes('conectar') ||
    value.includes('network') ||
    value.includes('timeout')
  )
    return 'network';
  if (
    value.includes('válid') ||
    value.includes('invalid') ||
    value.includes('zod')
  )
    return 'validation';
  return 'unknown';
}

export function reportSyncTelemetry(event: SyncTelemetryEvent): void {
  // Deliberately allowlisted: never log payloads, SyncId, tokens, user IDs or server messages.
  console.info('[nova-sync]', JSON.stringify(event));
}
