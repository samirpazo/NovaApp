# Pruebas y diagnóstico

## Validación automática

Antes de cerrar cualquier fase:

```bash
npm run typecheck
npm run lint
```

Cuando se modifica NovaApi:

Desde la raíz del repositorio Nova:

```bash
dotnet build NovaApi/NovaApi.csproj --no-restore
```

Resultado esperado: cero errores. Las advertencias nuevas también deben revisarse.

## Prueba funcional completa

Usar datos identificables y eliminarlos al terminar si no deben conservarse.

### 1. Login

1. Iniciar NovaApi.
2. Abrir Nova App.
3. Iniciar sesión con un usuario válido.
4. Confirmar nombre de usuario en inicio.
5. Recargar la app y confirmar restauración de sesión.

No documentar ni versionar contraseñas reales.

### 2. Pull inicial

1. Abrir Sincronización.
2. Pulsar Sincronizar.
3. Confirmar conteos de `GenDefinition`, `GenDefinitionDetail` y recursos disponibles por alcance.
4. Abrir listados y comprobar que leen de la base local.

### 3. Alta offline

1. Crear una definición con código único.
2. Confirmar ID entero negativo y estado Nuevo local.
3. Recargar/cerrar la app; el registro debe seguir presente.
4. Sincronizar.
5. Confirmar Cambios enviados.
6. Reabrir el registro: ID positivo y estado Sincronizado.
7. Verificar en Nova Web/servidor que existe una sola fila.

Si aparecen dos filas locales con igual UUID o datos equivalentes, revisar inmediatamente
`record._raw.id = syncId`.

### 4. Relación padre/detalle

1. Crear definición padre sin sincronizar.
2. Crear detalle asociado al padre negativo.
3. Sincronizar ambos.
4. Confirmar IDs positivos y FK del detalle al nuevo ID del padre.

### 5. Edición

1. Editar un registro sincronizado.
2. Confirmar estado Editado local.
3. Sincronizar.
4. Confirmar estado Sincronizado y valor actualizado en servidor.

### 6. Eliminación

1. Eliminar un detalle de prueba.
2. Sincronizar.
3. Confirmar que desaparece localmente y queda inactivo/eliminado en servidor.
4. Repetir con el padre cuando ya no se necesite.

Una respuesta Pull de borrado sin `Data` es válida.

## Prueba de conflicto

Preparación:

1. Crear `NOVA_APP_CONFLICT` desde Nova App.
2. Sincronizar hasta obtener ID positivo.

Conflicto:

1. Editar en Nova App: `Cambio desde Nova App`.
2. No sincronizar todavía.
3. Editar el mismo registro en Nova Web: `Cambio desde Nova Web`.
4. Guardar en Nova Web.
5. Sincronizar Nova App.
6. Debe aparecer un conflicto pendiente.
7. Abrir Sincronización > Conflictos.
8. Confirmar que ambas descripciones aparecen en columnas diferentes.

Servidor gana:

1. Pulsar Usar servidor.
2. El conflicto desaparece.
3. La descripción local queda `Cambio desde Nova Web`.
4. El registro queda sincronizado.

Local gana:

1. Repetir el conflicto con dos valores nuevos.
2. Pulsar Conservar local.
3. La app sincroniza automáticamente.
4. El servidor termina con el valor de Nova App.
5. El conflicto desaparece y la versión se reconcilia.

Ambos caminos fueron verificados manualmente el 9 de agosto de 2026.

## Diagnóstico frecuente

### El cursor no puede ser negativo

WatermelonDB usa `0` para indicar “nunca sincronizado”. Nova App guarda `backendCursor + 1` y resta
uno al consultar. Revisar que no se haya eliminado este offset.

### Invalid UUID

El backend devolvió un valor no estándar o el registro local fue creado sin `randomUUID()`.
`SyncId` debe cumplir el esquema UUID de Zod tanto en el cambio como dentro de `Data`.

### DeleteUserId/DeleteDate undefined

Los campos anulables del contrato deben aceptar `null` y, cuando la respuesta pueda omitirlos,
normalizar `undefined` apropiadamente. No declarar obligatoria una propiedad que NovaApi omite.

### Decorating class property failed

Revisar `babel.config.js`: decorators deben transformarse antes que class properties y usando la
configuración compatible con WatermelonDB/Expo 55. Reiniciar Metro con caché limpia tras cambiar Babel.

### Duplicado con ID negativo y positivo

Causa habitual: `Watermelon id !== SyncId`. Toda alta debe asignar ambos al mismo UUID. La limpieza
de reconciliados solo elimina duplicados históricos ya sincronizados y no debe ampliarse para borrar
cambios locales ambiguos.

### Push eliminó en servidor pero la app muestra error de Zod

Las respuestas de eliminación pueden omitir `Data`. Verificar `Data: Schema.nullish().transform(...)`
en `SyncPullChangeSchema`.

### Pendiente de sincronización inicial después de sincronizar

La pantalla debe leer `getLastPull()` y `hasUnsyncedChanges()`. Revisar que `LAST_PULL_KEY` se escriba
al completar y que el foco de la pantalla refresque el estado.

### Conflicto no aparece

Comprobar:

- ambos clientes editaron después de una sincronización común;
- Nova Web guardó antes del Push móvil;
- `preservePendingSyncVersion` está configurado en `synchronize()`;
- NovaApi compara versión cuando `Force=false`;
- el HTTP 409 contiene `Data.Results`.

### El mismo conflicto bloquea otros cambios

El UUID conflictivo debe excluirse del POST siguiente y devolverse en
`experimentalRejectedIds`. Los demás registros deben seguir en el lote.

### Conservar local vuelve a dar conflicto

Confirmar que el cambio sale con `Force=true`, que la clave de idempotencia cambió y que NovaApi fue
reiniciada después de compilar el soporte `Force`.

### Web y automatización muestran bases distintas

IndexedDB pertenece al perfil/origen del navegador. Chrome, Safari y un navegador automatizado no
comparten la base aunque usen la misma URL.

### Un teléfono no conecta a localhost

Configurar `EXPO_PUBLIC_API_URL` con la IP LAN o un host accesible. Confirmar firewall, CORS y que
NovaApi escuche en una interfaz adecuada.

## Datos locales en web

Para inspección técnica:

1. Abrir DevTools.
2. Ir a Application.
3. Abrir IndexedDB.
4. Buscar la base `nova-app` creada por LokiJS/WatermelonDB.

La forma exacta de almacenamiento es interna del adaptador; no editar manualmente IndexedDB como
procedimiento normal. Usar las pantallas y APIs de WatermelonDB.

## Criterio de aceptación actual

La fase base se considera validada porque se comprobó manualmente:

- alta y reconciliación de ID;
- edición y Push;
- alta de detalle relacionado;
- eliminación de detalle y definición;
- prevención/reparación de duplicados;
- estado de sincronización en inicio;
- conflicto real Nova App/Nova Web;
- usar versión del servidor;
- conservar versión local.
