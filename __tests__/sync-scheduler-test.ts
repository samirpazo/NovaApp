const netInfoListeners: ((state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) => void)[] = [];
const appStateListeners: ((status: string) => void)[] = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((listener: (state: unknown) => void) => {
      netInfoListeners.push(listener);
      return () => {
        const index = netInfoListeners.indexOf(listener);
        if (index >= 0) netInfoListeners.splice(index, 1);
      };
    }),
  },
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'native' },
  AppState: {
    addEventListener: jest.fn(
      (_event: string, listener: (s: string) => void) => {
        appStateListeners.push(listener);
        return { remove: () => undefined };
      },
    ),
  },
}));
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/sync/pull', () => ({ pullNova: jest.fn() }));
jest.mock('@/database', () => ({
  getActiveIdentityKey: jest.fn(() => 'account-a'),
}));
jest.mock('@/auth/store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      IsAuthenticated: true,
      Session: { User: { UsrID: 1 } },
    })),
  },
}));

import { pullNova } from '@/sync/pull';
import { SYNC_MIN_INTERVAL_MS, syncScheduler } from '@/sync/scheduler';

const offline = { isConnected: false, isInternetReachable: false };
const online = { isConnected: true, isInternetReachable: true };

function emitNetwork(state: typeof offline) {
  netInfoListeners.forEach((listener) => listener(state));
}

function emitForeground() {
  appStateListeners.forEach((listener) => listener('active'));
}

const settledPull = {
  Cursor: 1,
  Downloaded: 0,
  Uploaded: 0,
  Pages: 1,
  DurationMs: 10,
  FinishedAt: new Date().toISOString(),
};

describe('planificador de sincronización en segundo plano', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    netInfoListeners.length = 0;
    appStateListeners.length = 0;
    syncScheduler.stop();
    jest.mocked(pullNova).mockResolvedValue(settledPull);
  });

  afterEach(() => {
    syncScheduler.stop();
    jest.useRealTimers();
  });

  test('no sincroniza mientras el dispositivo está sin red', async () => {
    await syncScheduler.start();
    emitNetwork(offline);
    await jest.advanceTimersByTimeAsync(0);

    expect(pullNova).not.toHaveBeenCalled();
  });

  test('sincroniza cuando vuelve la conectividad', async () => {
    await syncScheduler.start();
    emitNetwork(offline);
    emitNetwork(online);
    await jest.advanceTimersByTimeAsync(0);

    expect(pullNova).toHaveBeenCalledTimes(1);
  });

  test('sincroniza al volver al primer plano', async () => {
    await syncScheduler.start();
    emitNetwork(online);
    await jest.advanceTimersByTimeAsync(0);
    (pullNova as jest.Mock).mockClear();

    jest.advanceTimersByTime(SYNC_MIN_INTERVAL_MS + 1000);
    emitForeground();
    await jest.advanceTimersByTimeAsync(0);

    expect(pullNova).toHaveBeenCalledTimes(1);
  });

  test('no repite sincronización dentro del intervalo mínimo', async () => {
    await syncScheduler.start();
    emitNetwork(online);
    await jest.advanceTimersByTimeAsync(0);
    (pullNova as jest.Mock).mockClear();

    emitForeground();
    await jest.advanceTimersByTimeAsync(0);

    expect(pullNova).not.toHaveBeenCalled();
  });

  test('aplica espera creciente después de varios fallos', async () => {
    jest.mocked(pullNova).mockRejectedValue(new Error('sin red'));
    await syncScheduler.start();
    emitNetwork(online);
    await jest.advanceTimersByTimeAsync(0);

    // La espera mínima de un minuto domina los primeros reintentos; a partir
    // del tercer fallo la espera creciente es la que limita los intentos.
    for (let attempt = 0; attempt < 2; attempt++) {
      jest.advanceTimersByTime(SYNC_MIN_INTERVAL_MS + 1000);
      emitForeground();
      await jest.advanceTimersByTimeAsync(0);
    }
    expect(pullNova).toHaveBeenCalledTimes(3);

    // Tras tres fallos la espera es de cinco minutos: un intento a los 61 s no
    // debe ejecutarse.
    (pullNova as jest.Mock).mockClear();
    jest.advanceTimersByTime(SYNC_MIN_INTERVAL_MS + 1000);
    emitForeground();
    await jest.advanceTimersByTimeAsync(0);
    expect(pullNova).not.toHaveBeenCalled();

    // Superada la espera, vuelve a intentarlo.
    jest.advanceTimersByTime(5 * 60 * 1000);
    emitForeground();
    await jest.advanceTimersByTimeAsync(0);
    expect(pullNova).toHaveBeenCalledTimes(1);
  });

  test('no superpone dos sincronizaciones', async () => {
    let release!: () => void;
    jest.mocked(pullNova).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(settledPull);
        }),
    );

    await syncScheduler.start();
    emitNetwork(online);
    await jest.advanceTimersByTimeAsync(0);
    jest.advanceTimersByTime(SYNC_MIN_INTERVAL_MS + 1000);
    emitForeground();
    await jest.advanceTimersByTimeAsync(0);

    expect(pullNova).toHaveBeenCalledTimes(1);
    release();
  });
});
