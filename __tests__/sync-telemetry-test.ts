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

  test('clasifica los fallos de credencial del servidor', () => {
    expect(
      classifySyncFailure(
        'La sesión del servidor expiró y no se pudo renovar.',
      ),
    ).toBe('credential');
    expect(
      classifySyncFailure(
        'No hay una credencial de dispositivo para renovar la sesión.',
      ),
    ).toBe('credential');
  });
});
