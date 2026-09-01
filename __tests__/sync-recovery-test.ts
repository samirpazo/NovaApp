import { syncRecoveryConfirmation } from '@/sync/recovery';

describe('sync recovery confirmation', () => {
  test('explains the complete download and protects pending offline changes', () => {
    expect(syncRecoveryConfirmation).toEqual({
      title: '¿Recuperar datos del servidor?',
      message: 'Se volverá a descargar el estado completo del servidor. Tus cambios offline pendientes se conservarán.',
      confirmLabel: 'Recuperar',
    });
  });
});
