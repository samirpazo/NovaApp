import { classifySyncFailure } from '@/sync/telemetry';

describe('telemetría de sincronización', () => {
  test('clasifica conflictos sin conservar el mensaje remoto', () => {
    expect(
      classifySyncFailure(
        'Se detectaron 2 conflictos pendientes de resolución.',
      ),
    ).toBe('conflict');
  });

  test('clasifica problemas de red en una categoría limitada', () => {
    expect(
      classifySyncFailure('No se pudo conectar con el servidor de Nova.'),
    ).toBe('network');
  });
});
