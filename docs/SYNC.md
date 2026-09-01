# Sincronización offline-first

## Responsabilidades

El motor principal está en `src/sync/pull.ts` y usa `synchronize()` de WatermelonDB.

El cliente es responsable de:

- capturar cambios locales;
- paginar Pull;
- validar respuestas;
- enviar Push idempotente;
- mantener pendientes los rechazos;
- reconciliar IDs y versiones;
- presentar conflictos.

NovaApi es responsable de:

- autenticar y autorizar;
- aplicar alcance;
- asignar IDs enteros positivos;
- generar `SyncVersion`;
- registrar cambios en el journal;
- comprobar concurrencia;
- aplicar transacciones y eliminaciones lógicas.

## Identidades

Cada registro tiene dos identidades con objetivos distintos:

| Identidad     | Ejemplo                      | Propietario      | Estabilidad                            |
| ------------- | ---------------------------- | ---------------- | -------------------------------------- |
| `SyncId` UUID | `683861b3-...`               | Cliente que crea | Permanente                             |
| ID entero     | `DefID=-1`, luego `DefID=91` | Servidor         | Temporal negativo, definitivo positivo |

Al crear localmente:

```ts
const syncId = randomUUID();
record._raw.id = syncId;
record.SyncId = syncId;
record.SyncVersion = '';
record.DefID = temporaryId; // -1, -2, -3...
```

La igualdad entre `id` y `SyncId` es necesaria para que el Pull actualice el mismo registro. Cuando
no se respetó esta regla, el cliente conservó el registro `-1` y creó otro con el ID positivo del
servidor. `removeReconciledDuplicates()` repara únicamente duplicados antiguos ya sincronizados,
pero no reemplaza la regla de creación correcta.

## SyncVersion

En SQL Server, `SyncVersion` funciona como rowversion. NovaApi lo expone como Base64. Una edición
envía la versión que el dispositivo conocía al comenzar su cambio.

Regla de concurrencia:

```text
versión enviada == versión actual del servidor -> aplicar
versión enviada != versión actual del servidor -> conflicto HTTP 409
```

El Pull ocurre antes del Push. WatermelonDB combina por defecto cambios remotos y locales. Nova App
usa `preservePendingSyncVersion()` para impedir que un Pull reemplace la versión antigua cuando el
registro todavía está `created` o `updated`. Sin esta protección, el Push enviaría la versión nueva
y sobrescribiría silenciosamente un cambio concurrente.

## Pull

Endpoint:

```http
GET /sync/pull?cursor={cursor}&limit={1..500}&branchId={opcional}
```

Respuesta lógica:

```json
{
  "Succeeded": true,
  "Message": null,
  "Data": {
    "Cursor": 1234,
    "HasMore": false,
    "IsBootstrap": false,
    "Changes": [
      {
        "Resource": "GenDefinition",
        "SyncId": "683861b3-3bcd-4c2f-aff5-98d48ee3c048",
        "Operation": "U",
        "Data": {}
      }
    ]
  }
}
```

### Bootstrap

Sin cursor, NovaApi devuelve el estado inicial de los recursos permitidos. Toma también el cursor
máximo del journal para que las siguientes ejecuciones sean incrementales.

Nova App ofrece **Descargar estado completo** para solicitar deliberadamente este bootstrap aunque
ya exista un cursor local. Se usa para recuperar instalaciones antiguas cuyo cursor fue creado antes
de que el journal cubriera todos los registros. La operación fusiona altas y actualizaciones del
servidor; no ejecuta `unsafeResetDatabase()` ni descarta cambios locales pendientes.

### Pull incremental

Con cursor, NovaApi consulta `SysSyncChanges` por `SycID > cursor`, ordena y pagina. El cliente:

1. descarga hasta que `HasMore` sea falso;
2. conserva el último cursor;
3. agrupa el último cambio de cada `Resource + SyncId`;
4. convierte altas/ediciones en `updated` remoto;
5. convierte eliminaciones en IDs de `deleted`;
6. deja que WatermelonDB cree si no existe y actualice si existe.

WatermelonDB interpreta `0` como nunca sincronizado. Por eso el timestamp local guardado es
`Cursor + 1` y al pedir al backend se resta uno. No eliminar este desplazamiento sin cambiar ambos
lados del contrato.

En una eliminación, `Data` puede omitirse. El esquema usa `nullish()` y normaliza a `null`.

## Push

Endpoint:

```http
POST /sync/push
Idempotency-Key: nova-sync-{sha256-del-lote}
X-CSRF-TOKEN: {token, solo web cuando corresponda}
```

Payload:

```json
{
  "BranchId": null,
  "Changes": [
    {
      "Resource": "GenDefinition",
      "SyncId": "683861b3-3bcd-4c2f-aff5-98d48ee3c048",
      "Operation": "U",
      "SyncVersion": "AAAAAAAAB9E=",
      "Force": false,
      "Data": {
        "DefID": 91,
        "DefCode": "NOVA_APP_CONFLICT",
        "DefDescription": "Descripción local"
      }
    }
  ]
}
```

Operaciones:

- `C`: creación; `Data` obligatorio.
- `U`: actualización; `Data` y `SyncVersion` obligatorios funcionalmente.
- `D`: eliminación; `Data` es `null`.

El cliente limita el lote a 500 cambios. `RstTable` no puede aparecer en Push.

### Contrato validado por recurso

Pull, Push, los resultados del Push y los conflictos se validan mediante una unión discriminada
por `Resource`. Por tanto, un cambio de `GenDefinition` solo admite los campos de esa entidad, y
lo mismo aplica a `GenDefinitionDetail` y `RstBranch`. Las operaciones `C` y `U` exigen `Data`; la
operación `D` exige `Data: null`. `RstTable` queda fuera del contrato de Push y de conflictos por
ser un recurso de solo lectura.

Los schemas `SyncJsonSchemas` exponen las formas JSON Schema Draft 2020-12 de Pull, Push, resultados
de Push y decisiones de conflicto. Son una representación para documentación o validadores externos;
la validación de runtime continúa haciéndose con Zod antes de tocar WatermelonDB.

El detalle de definición sincroniza la referencia inmutable `DedImageFilID`, no una ruta local ni
`DedImagePath`. La versión 2 del esquema de WatermelonDB agrega esa columna y conserva la columna
legada para no perder datos de instalaciones existentes; solo el identificador participa en el
contrato de sincronización.

Las imágenes de `GenDefinitionDetail` se cargan antes mediante `POST /GenFiles/upload` usando
`ROUTE_DEFINITION_IMGS`. La entidad local y el Push solo conservan el `FileId` en `DedImageFilID`;
el archivo administrado permanece inmutable y no se replica por WatermelonDB.

## Observabilidad local

Cada sincronización emite un evento estructurado `sync_completed` o `sync_failed` con duración,
cantidad enviada/recibida/páginas o una categoría limitada de fallo. No se emiten tokens, UUIDs,
usuarios, payloads ni mensajes remotos. La pantalla de sincronización muestra duración y páginas de
la última ejecución para diagnóstico local.

### Idempotencia

El cliente serializa el lote completo, calcula SHA-256 y usa ese hash en `Idempotency-Key`. Si una
respuesta se pierde y se reintenta exactamente el mismo lote, NovaApi debe devolver la respuesta
almacenada sin aplicar dos veces.

Cambiar cualquier campo, incluido `Force`, produce una clave distinta. Esto es intencional: una
resolución “Conservar local” es una decisión posterior diferente del intento conflictivo.

### Orden y relaciones temporales

NovaApi procesa primero `GenDefinition` y guarda. Mantiene un mapa entre `DefID` negativo y el nuevo
`DefID` positivo. Luego procesa `GenDefinitionDetail`, sustituyendo el `DefID` temporal cuando padre
y detalle fueron creados en el mismo lote.

Para futuras relaciones offline debe implementarse una estrategia equivalente. No enviar una FK
negativa a SQL Server esperando que sea válida.

## Reconciliación posterior al Push

Cuando el Push aplicó cambios, WatermelonDB marca el lote como sincronizado. Inmediatamente se hace
un segundo Pull para obtener:

- ID entero positivo asignado;
- `SyncVersion` nuevo;
- auditoría definitiva del servidor;
- normalizaciones efectuadas por backend.

Como `id === SyncId`, el Pull actualiza el mismo registro. Después se ejecuta la limpieza conservadora
de duplicados históricos.

## Eliminaciones

La pantalla ejecuta:

```ts
await database.write(() => model.markAsDeleted());
```

WatermelonDB conserva el tombstone para Push. NovaApi realiza soft delete actualizando `SecStatus`,
`DeleteUserId` y `DeleteDate`. Tras la confirmación, WatermelonDB elimina el tombstone local.

Una eliminación originada en Nova Web puede llegar en Pull como un registro con
`SecStatus = false`, según la entrada del journal. Por ello, todas las consultas funcionales de
WatermelonDB deben incluir `Q.where('SecStatus', true)`. El almacenamiento local puede conservar el
registro inactivo; la interfaz, los selectores y las relaciones activas no deben mostrarlo.

No usar `destroyPermanently()` antes de sincronizar: se perdería la intención de borrado.

## Conflictos

### Detección

NovaApi pre-valida el lote. Si una actualización tiene una versión antigua, responde HTTP 409:

```json
{
  "Succeeded": false,
  "Message": "Uno o más cambios no se pudieron aplicar.",
  "Data": {
    "Results": [
      {
        "Resource": "GenDefinition",
        "SyncId": "683861b3-3bcd-4c2f-aff5-98d48ee3c048",
        "Status": "Conflict",
        "Message": "El registro cambió en el servidor desde la última sincronización.",
        "Data": { "DefDescription": "Cambio desde Nova Web" }
      }
    ]
  }
}
```

La app guarda:

- recurso y UUID;
- operación;
- versión local completa enviada;
- versión actual devuelta por servidor;
- mensaje y fecha;
- decisión de conservar local, si existe.

Los conflictos se almacenan en `database.localStorage` con clave `nova.sync.conflicts`, por lo que
pertenecen al alcance de la base local.

### No bloquear otros cambios

En ejecuciones siguientes, un conflicto sin resolver se excluye del POST y su UUID se devuelve en
`experimentalRejectedIds`. WatermelonDB conserva ese registro pendiente, pero puede confirmar el
resto del lote.

La decisión de resolución se valida como un comando discriminado antes de modificar el estado:

```ts
{
  Decision: ('KeepLocal' | 'UseServer', Resource, SyncId);
}
```

`KeepLocal` conserva el cambio local para el siguiente Push con `Force`; `UseServer` aplica la
versión recibida del servidor y elimina el conflicto. `RstTable`, por ser de solo lectura, no puede
ser una decisión válida.

### Presentación en la app

La pantalla de resolución muestra cada campo divergente mediante `ConflictComparison`. En móvil,
las versiones se apilan para conservar legibilidad; desde tablet se presentan en paralelo. La
procedencia siempre combina icono y texto (`En este dispositivo` / `En el servidor`) y no depende
solo del color.

Las acciones deben conservar su significado exacto:

- `Usar versión del servidor`: descarta la modificación local pendiente y aplica `ServerData`.
- `Mantener mi cambio`: marca la decisión local y ejecuta el Push forzado seguido de Pull.

Mientras cualquiera de las decisiones se procesa, ambas acciones del conflicto permanecen
deshabilitadas y muestran actividad. No añadir una resolución automática desde la interfaz.

### Usar servidor

1. Se valida `ServerData` como si fuera un cambio Pull.
2. Se reemplazan los campos locales sin registrar una nueva modificación.
3. `_status` se establece en `synced` y `_changed` se limpia.
4. Se elimina el conflicto almacenado.

Resultado: la versión local coincide con NovaApi y no genera Push.

### Conservar local

1. El conflicto se marca `KeepLocal=true`.
2. Se ejecuta una sincronización.
3. El cambio se incluye con `Force=true`.
4. NovaApi omite únicamente la comparación de versión y conserva las demás validaciones.
5. Tras `Applied`, se elimina el conflicto.
6. El Pull de reconciliación descarga la versión nueva.

`Force` no significa acceso irrestricto: siguen aplicando autenticación, recurso permitido, alcance,
existencia y forma del payload.

## Cambio de alcance

El alcance se identifica como:

```text
baseUrl normalizada | BranchId o general
```

Si cambia, la base local se reinicia para no mezclar datos. Antes de habilitar selección visible de
sucursal se debe bloquear el cambio cuando haya pendientes o pedir sincronizarlos/descartarlos.

## Estado técnico

`PullResult` conserva:

- `Cursor`
- `Downloaded`
- `Uploaded`
- `Pages`
- `FinishedAt`

El header combina `getLastPull()` con el conteo local de cambios para mostrar:

- pendiente de sincronización inicial;
- cambios pendientes;
- sincronizado.

Un Push exitoso cuenta como sincronización aunque la última operación haya descargado cero cambios.

`useSyncIndicators()` observa todas las tablas de `SYNC_RESOURCES` y cuenta los registros creados,
editados y eliminados que WatermelonDB enviaría en el próximo Push. También hidrata y observa los
conflictos guardados en `nova.sync.conflicts`. Estos datos son completamente locales: el badge de
`Sincronizar` y el del icono del header muestran los cambios pendientes, mientras el badge de
`Conflictos` muestra decisiones sin resolver. Los badges se ocultan en cero y presentan `99+` al
superar 99 elementos.

## Preferencias de apariencia

`SecUserPreference` no forma parte del journal de entidades WatermelonDB. Es un singleton por usuario
y usa una cola local de último valor (`nova.appearance.pending`): un guardado offline confirma la
preferencia en el dispositivo y reemplaza cualquier pendiente anterior. Al recuperar conectividad se
envía `Theme`, `PrimaryColor` y `HeaderColor` a `SecUserPreference/Save`; solo después se elimina la
cola. Antes de consultar `MyPreferences` al autenticar se intenta vaciarla, para no sobrescribir una
decisión offline reciente con una versión antigua del servidor.
