# Preparación offline

Este documento resume qué garantiza hoy Nova App cuando el dispositivo pierde la conexión con
NovaApi, cómo se recupera y qué límites siguen existiendo. Es la referencia para diagnosticar
un dispositivo en campo.

## Principio

La app separa la **confianza local** de la **credencial del servidor**:

- La confianza local vive en el almacenamiento seguro del dispositivo y **no caduca por tiempo**.
  Mientras exista, la app abre y todos los datos locales están disponibles.
- La credencial del servidor (access token + refresh + credencial de dispositivo) es una caché.
  Si no se puede renovar, la app **degrada la sincronización, nunca el trabajo en campo**.

Antes de este modelo, un `401` del servidor cerraba la sesión local y dejaba el dispositivo
inutilizable a los pocas horas sin señal.

## Garantías

| Garantía | Cómo se sostiene |
|---|---|
| Arrancar sin red | `AuthGate` se apoya en la confianza local; la renovación ocurre en segundo plano |
| Capturar visitas sin red | Toda edición se guarda primero en WatermelonDB |
| No perder datos al reiniciar | SQLite nativo durable; los cambios pendientes conservan `_status` |
| No duplicar al reintentar un Push | `Idempotency-Key` determinista por lote |
| No duplicar una carga de archivo | `uploadId` estable persistido en el snapshot local + `GenFile.FilUploadId` |
| No perder un Push interrumpido | WatermelonDB mantiene el cambio pendiente hasta la confirmación |
| Volver a sincronizar solo | Renovación silenciosa: refresh → credencial de dispositivo |
| Cerrar sesión sin borrar datos | El cierre elimina credenciales, nunca la base local |

## Matriz de fallos

| Situación | Qué ve el técnico | Qué ocurre en la app | Recuperación |
|---|---|---|---|
| Sin cobertura al abrir la app | App normal con datos locales | Se omite la sincronización (`sync_skipped_offline`) | Automática al recuperar la red |
| Servidor caído | Aviso "Sin sincronización con Nova" | La renovación espera con reintento creciente | Automática |
| Access token vencido, refresh vigente | Nada | Renovación transparente | Automática |
| Sesión del servidor expirada | Nada | Canje por credencial de dispositivo | Automática |
| Credencial de dispositivo vencida (> 180 días sin contacto) | Aviso "Sin sincronización con Nova" | Se conserva la confianza local; solo se detiene la sincronización | El técnico inicia sesión de nuevo |
| Credencial de dispositivo revocada (equipo perdido) | Aviso "Esta cuenta ya no puede sincronizar" | Se cierra el acceso local | El usuario se autentica de nuevo |
| Cuenta desactivada o vencida | Aviso "Esta cuenta ya no puede sincronizar" | Se cierra el acceso local | El administrador reactiva la cuenta |
| Conflicto de datos | Pantalla de comparación | El usuario elige servidor o local | Automática tras la decisión |
| Evidencia sin confirmar en el servidor | Contador de pendientes | El reintento reutiliza el `uploadId` y no duplica | Automática |

## Sincronización automática

Cuatro señales alimentan la misma operación, con exclusión mutua:

- volver al primer plano (`AppState`),
- recuperar la conectividad (`NetInfo`),
- un temporizador de 5 minutos con la app abierta,
- la tarea del sistema operativo (`expo-background-task`).

Entre sincronizaciones automáticas hay un mínimo de 60 segundos. Un fallo aplica espera creciente
(30 s, 1 min, 5 min, 15 min, 1 h) que además se persiste, para que reiniciar la app no reinicie la
espera.

En Android, WorkManager aplica la restricción de conectividad de forma nativa. En iOS la ventana la
decide el sistema: **no hay cadencia garantizada**. La cobertura fiable la dan el primer plano y la
recuperación de conectividad.

## Límites conocidos

- **Web**: el almacenamiento local vive en IndexedDB y el navegador puede desalojarlo. La app pide
  almacenamiento persistente y ofrece "Exportar respaldo de datos locales" en la pestaña de
  sincronización, pero **la garantía de no perder datos es exclusiva de la app nativa**.
- **iOS**: la base SQLite entra en la copia de seguridad de iCloud, mientras que las credenciales
  usan `WHEN_UNLOCKED_THIS_DEVICE_ONLY` y no se restauran. Al restaurar en otro dispositivo, el
  técnico debe iniciar sesión en la misma cuenta y recupera sus datos: la base se identifica por
  `SHA256(servidor + PrsID + UsrID)`.
- **Equipo perdido**: la credencial de dispositivo puede revocarse desde Nova Web
  (`GET /Token/DeviceTokens`, `POST /Token/DeviceTokens/{id}/Revoke`). La app se entera en el
  siguiente contacto con el servidor y entonces bloquea el acceso local.
- **Contraseña del usuario**: nunca se guarda en el dispositivo. La credencial de dispositivo
  sustituye esa necesidad.
