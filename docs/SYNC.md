# Sincronización offline-first

## Responsabilidades

El motor principal está en `src/sync/pull.ts` y usa `synchronize()` de WatermelonDB.

El cliente es responsable de:

- capturar cambios locales;
- paginar Pull;
- validar respuestas;
- enviar Push en lotes compatibles con el límite del servidor y conservar sus confirmaciones;
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

Al crear localmente, los IDs temporales negativos deben permanecer dentro del rango `Int32` que
usan los contratos del servidor. El callback de Push también normaliza IDs temporales antiguos que
se hayan guardado fuera de ese rango, conservando las referencias repetidas del snapshot.

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

El cliente ordena las dependencias conocidas y divide Push en lotes secuenciales de hasta 500
cambios. Solo marca como sincronizados los cambios identificados como `Applied`; los rechazados y
los lotes posteriores continúan pendientes. `RstTable` no puede aparecer en Push.

### Contrato validado por recurso

Pull, Push, los resultados del Push y los conflictos se validan mediante una unión discriminada
por `Resource`. Por tanto, un cambio de `GenDefinition` solo admite los campos de esa entidad, y
lo mismo aplica a `GenDefinitionDetail`, `RstBranch` y los recursos de visitas técnicas. Las operaciones `C` y `U` exigen `Data`; la
operación `D` exige `Data: null`. `RstTable` queda fuera del contrato de Push y de conflictos por
ser un recurso de solo lectura.

Los schemas `SyncJsonSchemas` exponen las formas JSON Schema Draft 2020-12 de Pull, Push, resultados
de Push y decisiones de conflicto. Son una representación para documentación o validadores externos;
la validación de runtime continúa haciéndose con Zod antes de tocar WatermelonDB.

Las visitas técnicas usan dos recursos. `OagTechnicalVisitSchedule` se sincroniza como registro
editable y queda limitado al `PrsID` autenticado. `OagTechnicalVisit` es el recurso agregado:
su fila local conserva el encabezado y un `Snapshot` JSON con todas las secciones de la visita.
Los tokens web incluyen el claim `PrsID` cuando la cuenta está vinculada a una persona; para tokens
web anteriores, NovaApi resuelve la relación desde la cuenta autenticada. Como los recursos OAG se
incorporan después de otros catálogos al esquema local, NovaApp solicita una descarga completa una
vez por alcance para incluir programaciones y visitas ya existentes que no tengan cambios recientes
en el journal.
El backend ordena primero las programaciones, remapea sus IDs temporales y después guarda cada
visita mediante `SaveAggregate`. El permiso requerido en Push es `OAG_TECHNICAL_VISIT`.
El cambio del encabezado registra el agregado en el journal, por lo que el Pull móvil recibe un
snapshot completo; los endpoints antiguos de edición puntual de secciones no notifican el agregado.
La caché también incluye los catálogos requeridos por visitas técnicas: campañas; fundos, lotes y
asignaciones activas del supervisor autenticado; fuentes de agua de esos lotes; cultivos y variedades
de esos lotes; insumos vinculados a objetivos activos de esos cultivos; plagas y relaciones con
cultivos. Los catálogos se descargan como
ReadOnly. `GenCampaign` es global; fundos, lotes, fuentes y asignaciones activas se limitan en NovaApi
al alcance actual del `PrsID`. Las relaciones de producto y plaga se limitan a los cultivos de esos
lotes. Las definiciones
y detalles ya se sincronizaban antes. No se replica `GenParameter`: los selectores web revisados no
lo consumen. La caché migra a WatermelonDB schema v4 y solicita un bootstrap por alcance para traer
los registros existentes. La revisión local de bootstrap v4 solicita una descarga completa adicional
para instalaciones que ya habían marcado la revisión previa; el merge conserva los cambios pendientes.

El filtro de estado de visita comparte la definición `OAG_TECHNICAL_VISIT_FILTER_STATUS` entre web y
móvil. Sus abreviaturas estables (`all`, `pending`, `registered`) controlan el filtro; la app toma las
descripciones desde `GenDefinitionDetail` sincronizado. El seed está en
`Nova/scripts/data/oag-technical-visit-catalogs.sql`.

La lista móvil permite crear, editar y eliminar programaciones localmente desde el NCrud. El formulario
usa los catálogos descargados, asigna la programación al supervisor autenticado y no sincroniza al
guardar; el Push central conserva el flujo idempotente y de conflictos. El filtro de supervisor se omite
porque el servidor ya limita las programaciones por `PrsID`.

Firmas y evidencias conservan sus URI locales pendientes mientras el dispositivo está offline. Antes
del Push, la app las carga con `POST /GenFiles/upload` y `ROUTE_TECHNICAL_VISIT_FILES`, guarda en el
snapshot local el identificador estable de intento y el `FileId` recibido, y envía la visita como
agregado. Así, los archivos cuya respuesta de carga se confirmó no vuelven a solicitarse cuando falla
un archivo posterior o el Push. El checkpoint fusiona esos recibos con el snapshot local más reciente.
Nova debe soportar idempotencia durable por `Idempotency-Key` para cerrar el caso de respuesta de carga
perdida: el middleware actual compara el hash del cuerpo HTTP multipart completo, incluidos bytes que
pueden variar al reconstruir `FormData`. Sin una garantía del servidor o una prueba aislada que confirme
replay idéntico, no se afirma entrega exactamente una vez tras una respuesta ambigua. Después de que el
Push se confirma, la app aplica el agregado y la versión canónicos del servidor al registro local.

La firma existente se obtiene mediante una petición autenticada de `api` y se conserva como imagen
en `database.localStorage`, identificada por `FilID`. La caché pertenece al alcance de la base local
y se elimina con su reinicio; los archivos son inmutables. Después de abrir y descargar una firma
en línea, su vista previa puede reutilizarse sin red. Esto no implica que todas las evidencias
binarias se descarguen durante el Pull JSON. El helper es `src/lib/managed-image.ts`.

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
await database.write(async () => {
  await model.update((record) => {
    record.DeleteUserId = userId;
    record.DeleteDate = new Date().toISOString();
  });
  await model.markAsDeleted();
});
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

## Almacenamiento offline multicuenta

Cada almacenamiento local WatermelonDB pertenece a una identidad calculada con servidor normalizado,
`PrsID` y `UsrID`. El nombre físico usa SHA-256 de esa identidad y no revela esos valores. Native
usa SQLite; web crea un almacén Loki/IndexedDB con el mismo nombre aislado. La instancia activa se
captura al comenzar una operación, de modo que una respuesta tardía no cambia a la base seleccionada
después. Pull serializa operaciones por identidad, y las solicitudes con usuario esperado vuelven a
validar la identidad antes de obtener el token y enviar.

`BranchId` no forma parte de la identidad global del almacenamiento: sucursales pertenecen al
alcance Restaurant, no a General ni OAG. La configuración actual todavía envía el `BranchId`
opcional por el contrato de sincronización; no se debe interpretar como filtro general del cliente.

Conflictos, cursores, snapshots, checkpoints multimedia, opciones de menú y cachés Watermelon quedan
aislados por base. Preferencias y su cola pendiente se guardan bajo el hash de identidad, además del
usuario, para evitar colisiones si el mismo `UsrID` existe en dos servidores. El estado Zustand de
conflictos y sincronización se limpia al cambiar de cuenta. Cerrar sesión revoca/borra la única sesión
activa; volver a una cuenta requiere autenticarse de nuevo. Ningún token se copia entre identidades.

Firmas y evidencias nativas nuevas se copian a `document/nova-app/{identityHash}`; la web persiste
el contenido como data URI dentro del snapshot de la base IndexedDB de esa identidad. Los archivos
pendientes no se borran al salir, cambiar de cuenta o fallar una subida. Solo el ACK confirmado retira
la referencia local del snapshot. La limpieza física de archivos ya confirmados sigue siendo
conservadora; puede dejar archivos huérfanos, pero no elimina evidencia offline.

### Compatibilidad con `nova-app` legado

La base única anterior se conserva sin reinicio ni copia. Solo se adopta cuando
`nova.sync.activeScope` y `nova.sync.activeScopeUser` prueban que servidor, usuario y persona
coinciden con la identidad autenticada; antes de usarla se persiste el hash propietario en
`nova.storage.owner`. Los demás usuarios reciben una base nueva. Si faltan o no coinciden los
metadatos, la base y sus archivos permanecen intactos y sin asignar: no se adjudican al primer usuario
ni se ejecuta `unsafeResetDatabase()`. Los conflictos legados se migran al ámbito del usuario solo
cuando el mismo alcance guardado acredita al propietario; de lo contrario se conservan en la clave de
cuarentena `nova.sync.conflicts.unassignedLegacy` dentro del almacenamiento legado.

La recuperación automática no puede inferir quién posee datos sin esos metadatos. Para esos casos se
debe recuperar una copia desde respaldo o construir un flujo explícito de revisión/atribución que
requiera verificación de identidad; no se deben fusionar snapshots ambiguos con una base activa.

WatermelonDB 0.28 no expone una API pública `close/dispose` para Database/SQLiteAdapter. El gestor
mantiene una instancia por identidad para evitar abrir dos objetos simultáneos con el mismo archivo al
volver a una cuenta. Los observers de UI se desuscriben al desmontar las pantallas, pero la liberación
de conexiones nativas de bases ya visitadas no está garantizada mediante API pública. Hay que validar
el ciclo en dispositivos iOS/Android antes de aumentar el número esperado de cuentas por instalación.

La sincronización usa el servidor fijado en `EXPO_PUBLIC_API_URL`. Si una conexión persistida apunta
a otro host o ruta, Pull se detiene antes de enviar tokens o asociar respuestas a una base local;
esta app todavía no admite cambiar de servidor en ejecución.

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
conflictos guardados por usuario. Estos datos son completamente locales: el badge de
`Sincronizar` y el del icono del header muestran los cambios pendientes, mientras el badge de
`Conflictos` muestra decisiones sin resolver. Los badges se ocultan en cero y presentan `99+` al
superar 99 elementos.

## Preferencias de apariencia

`SecUserPreference` no forma parte del journal de entidades WatermelonDB. Es un singleton por usuario
y usa claves locales `nova.appearance.user.{UsrID}` y `nova.appearance.pending.user.{UsrID}`. Una
preferencia offline reemplaza únicamente la cola de último valor de esa identidad. Tras el POST se
elimina solo si la cola conserva el mismo valor que se envió, para no borrar una preferencia más nueva
encolada durante la solicitud. Antes de consultar `MyPreferences` se vacía únicamente la cola de la
sesión activa. No se migran claves legadas sin propietario porque no es posible atribuirlas con
seguridad.

### Recuperación de snapshots de visitas existentes

La marca local `nova.sync.technicalVisitBootstrapScope.v4` fuerza un bootstrap una sola vez por
alcance para recuperar snapshots que pudieron quedar incompletos en instalaciones anteriores.
La descarga fusiona datos y conserva los cambios offline pendientes con el mecanismo normal de
WatermelonDB. No reinicia la base local. El listado abre la visita mediante el `TviID` de su
programación y vuelve a consultar el almacenamiento al pulsar el ojo de esa fila. Si esa visita
registrada todavía no está descargada, no crea un borrador vacío en su lugar.
