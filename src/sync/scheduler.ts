import NetInfo, {
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { getActiveIdentityKey } from '@/database';
import { storage } from '@/lib/storage';
import { pullNova } from '@/sync/pull';
import { reportSyncTelemetry } from '@/sync/telemetry';

export type SyncTrigger =
  'foreground' | 'connectivity' | 'timer' | 'background';

const BACKOFF_KEY = 'nova.sync.backoff';
/** Intervalo del temporizador de primer plano. */
export const SYNC_TIMER_INTERVAL_MS = 5 * 60 * 1000;
/** Separación mínima entre dos sincronizaciones automáticas. */
export const SYNC_MIN_INTERVAL_MS = 60 * 1000;
/** Espera creciente tras un fallo: 30 s, 1 min, 5 min, 15 min, 1 h. */
export const SYNC_BACKOFF_STEPS_MS = [
  30_000, 60_000, 300_000, 900_000, 3_600_000,
];

interface BackoffRecord {
  attempts: number;
  nextAttemptAt: number;
}

async function readBackoff(): Promise<BackoffRecord> {
  try {
    const value = await storage.getItem(BACKOFF_KEY);
    if (!value) return { attempts: 0, nextAttemptAt: 0 };
    const parsed = JSON.parse(value) as Partial<BackoffRecord>;
    return {
      attempts:
        typeof parsed.attempts === 'number' && parsed.attempts > 0
          ? parsed.attempts
          : 0,
      nextAttemptAt:
        typeof parsed.nextAttemptAt === 'number' ? parsed.nextAttemptAt : 0,
    };
  } catch {
    return { attempts: 0, nextAttemptAt: 0 };
  }
}

async function writeBackoff(record: BackoffRecord): Promise<void> {
  try {
    await storage.setItem(BACKOFF_KEY, JSON.stringify(record));
  } catch {
    // El registro de espera es una optimización: si no se puede guardar, la
    // sincronización sigue funcionando con el estado en memoria.
  }
}

/**
 * Planificador de sincronización en segundo plano.
 *
 * La app de campo permanece horas sin red, así que la sincronización no puede
 * depender de que el usuario pulse un botón. Este planificador combina cuatro
 * señales —volver a primer plano, recuperar conectividad, un temporizador y la
 * tarea del sistema operativo— y las serializa en una sola operación.
 *
 * Nunca se superponen dos sincronizaciones y los fallos aplica espera
 * creciente para no castigar la batería ni el servidor.
 */
class SyncScheduler {
  private started = false;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private netInfoSubscription: NetInfoSubscription | null = null;
  private attempts = 0;
  private nextAttemptAt = 0;
  private lastFinishedAt = 0;
  private online = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const backoff = await readBackoff();
    this.attempts = backoff.attempts;
    this.nextAttemptAt = backoff.nextAttemptAt;

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (status) => {
        if (status === 'active') void this.trigger('foreground');
      },
    );

    this.netInfoSubscription = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      const recovered = online && !this.online;
      this.online = online;
      if (recovered) void this.trigger('connectivity');
    });

    this.timer = setInterval(
      () => void this.trigger('timer'),
      SYNC_TIMER_INTERVAL_MS,
    );

    // Al abrir la app se sincroniza una vez: el dispositivo pudo haber pasado
    // horas sin contacto con el servidor.
    void this.trigger('foreground');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.netInfoSubscription?.();
    this.netInfoSubscription = null;
    this.started = false;
    this.running = false;
    this.online = false;
    this.attempts = 0;
    this.nextAttemptAt = 0;
    this.lastFinishedAt = 0;
  }

  /**
   * Espera a que la base de la cuenta esté activada. El planificador arranca
   * junto con la sesión, y la base local se activa después; sin esta espera la
   * primera señal se perdería y contaría como un fallo.
   */
  private async waitForAccountDatabase(): Promise<boolean> {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (getActiveIdentityKey()) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }

  /**
   * Ejecuta una sincronización automática. Nunca propaga el error: un fallo
   * solo significa que habrá que reintentar más tarde.
   */
  async trigger(
    trigger: SyncTrigger,
    options: { force?: boolean } = {},
  ): Promise<void> {
    if (!useAuthStore.getState().IsAuthenticated) return;
    if (!useAuthStore.getState().Session) return;
    if (this.running) return;

    // La marca de ejecución se toma antes de esperar: dos señales seguidas no
    // pueden solaparse.
    this.running = true;
    let ran = false;
    try {
      if (!(await this.waitForAccountDatabase())) return;

      // Una acción explícita del usuario (por ejemplo, volver a iniciar
      // sesión) salta el intervalo mínimo y la espera: no tiene sentido
      // delaying lo que el usuario acaba de pedir.
      if (options.force) {
        this.nextAttemptAt = 0;
        this.lastFinishedAt = 0;
      }

      const now = Date.now();
      if (now < this.nextAttemptAt) return;
      if (now - this.lastFinishedAt < SYNC_MIN_INTERVAL_MS) return;
      if (!this.online) {
        reportSyncTelemetry({ event: 'sync_skipped_offline' });
        return;
      }

      ran = true;
      try {
        const result = await pullNova();
        this.attempts = 0;
        this.nextAttemptAt = 0;
        await writeBackoff({ attempts: 0, nextAttemptAt: 0 });
        reportSyncTelemetry({
          event: 'sync_completed',
          durationMs: result.DurationMs,
          downloaded: result.Downloaded,
          uploaded: result.Uploaded,
          pages: result.Pages,
        });
      } catch {
        this.attempts += 1;
        const delay =
          SYNC_BACKOFF_STEPS_MS[
            Math.min(this.attempts - 1, SYNC_BACKOFF_STEPS_MS.length - 1)
          ];
        this.nextAttemptAt = Date.now() + delay;
        await writeBackoff({
          attempts: this.attempts,
          nextAttemptAt: this.nextAttemptAt,
        });
        reportSyncTelemetry({
          event: 'sync_failed',
          durationMs: 0,
          failureKind: 'network',
        });
      }
    } finally {
      if (ran) this.lastFinishedAt = Date.now();
      this.running = false;
    }
  }
}

export const syncScheduler = new SyncScheduler();
