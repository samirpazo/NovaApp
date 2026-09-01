# NCrud offline-first

## Objetivo

`NCrud` de Nova App es la adaptación offline-first del `NCrud` de Nova Web.
Compartirá conceptos de búsqueda, columnas, selección, acciones y paginación,
pero su fuente de datos será local y reactiva mediante `NCrudDataSource`.

## Límites de cada capa

- `NCrud`: presentación, selección, toolbar, filtros, paginación y acciones.
- `NCrudDataSource`: consulta reactiva de WatermelonDB y transformación de filas.
- Servicio de feature: validación, creación, edición, eliminación y auditoría local.
- Sincronización: envío de cambios pendientes, conflictos e incorporación de cambios remotos.

El componente no debe hacer llamadas HTTP ni conocer tablas de WatermelonDB.

## Contrato vigente

Los contratos compartidos están en `src/components/crud/contracts.ts`:

- `NCrudRow`: identidad local y estado de sincronización.
- `NCrudColumn`: definición de columnas, búsqueda, ordenamiento y exportación.
- `NCrudSelectionMode`: ninguna, simple o múltiple.
- `NCrudAction`: acciones sobre una o varias filas.
- `NCrudDataSource`: consulta paginada y reactiva contra WatermelonDB.
- `NCrudFormConfig`: ciclo común de alta y edición.

`NCrudToolbarConfig` declara las operaciones estándar. Agregar, editar, eliminar
y exportar pertenecen al toolbar y no deben recrearse como acciones
personalizadas. `NCrudActionPlacement` se reserva para acciones funcionales
adicionales de toolbar, fila o selección masiva.

## Equivalencias con Nova Web

| Nova Web                | Nova App offline-first             |
| ----------------------- | ---------------------------------- |
| `service`               | `NCrudDataSource` + servicio local |
| `headers`               | `NCrudColumn`                      |
| `onRowSelected`         | `onSelectionChange(rows)`          |
| `extraActions`          | `NCrudAction`                      |
| paginación del endpoint | paginación reactiva local          |
| respuesta API           | modelo local con `syncStatus`      |
| mutación HTTP           | mutación local pendiente           |
| refresh del servidor    | emisión reactiva + sincronización  |

## Pantallas migradas

- Definiciones (`GenDefinition`).
- Valores de definición (`GenDefinitionDetail`), filtrados por `DefID`.
- Sucursales (`RstBranch`).
- Mesas (`RstTable`, solo lectura).

Todas consumen `dataSource`; ninguna carga la colección completa en estado React
ni entrega `rows` manualmente. Los selectores auxiliares pueden mantener sus
propias suscripciones reactivas cuando no forman parte del listado paginado.

## Integración de sincronización

Cada CRUD sincronizable declara explícitamente su recurso; el componente no
deduce nombres de tablas ni ejecuta HTTP directamente:

```tsx
<NCrud
  offline={{ resource: SYNC_RESOURCES.GenDefinition }}
  // ...
/>
```

Con esta configuración, `NCrud`:

- muestra el resumen global de cambios pendientes del dispositivo;
- refleja `Nuevo local`, `Editado local`, `Sincronizando` y `Sincronizado`;
- prioriza `Conflicto` cuando existe uno para el recurso y `SyncId` de la fila;
- permite sincronizar, reintentar un error y abrir la resolución de conflictos;
- actualiza la tabla reactivamente cuando WatermelonDB aplica el pull.

El CRUD no implementa push, pull ni resolución de relaciones. El motor central
mantiene la idempotencia, el orden padre-hijo y la reconciliación de IDs. En una
relación como `GenDefinition` → `GenDefinitionDetail`, los servicios locales
guardan la referencia estable y el motor sincroniza ambos recursos; no deben
crearse reintentos HTTP particulares desde una pantalla.

## Exportación local

El toolbar habilita la exportación con `toolbar={{ export: true }}`. Si existen
filas seleccionadas exporta solamente esa selección; en caso contrario solicita
al `NCrudDataSource` todos los registros que cumplen la búsqueda, filtros y orden
actual, usando `PageSize: -1`. La operación consulta WatermelonDB y funciona sin
conexión.

Nova App genera CSV UTF-8 con BOM y separador `;`, compatible con Excel en
configuración regional `es-PE`. En web descarga el archivo y en Android/iOS abre
el diálogo nativo para compartirlo. Una columna se excluye con
`exportable: false`. Como `format` puede devolver JSX, los valores destinados al
archivo usan un formateador independiente:

```tsx
{
  key: 'Amount',
  title: 'Importe',
  format: (row) => <Text>{formatters.currency(row.Amount)}</Text>,
  exportFormat: (row) => formatters.decimal(row.Amount),
}
```

El indicador de ejecución del toolbar evita dobles exportaciones. Las pantallas
pueden conservar un `onExport` propio cuando necesiten reemplazar completamente
el comportamiento estándar.

## Permisos y seguridad

Un CRUD protegido declara el mismo código usado por `RequireOption` en NovaApi:

```tsx
<NCrud authorization={{ optCode: 'GEN_DEFINITIONS' }} />
```

Nova App obtiene `Operations` desde `GET /SecUser/MyOptions?mobileOnly=true` y
usa su caché aislada por usuario. Crear, editar, eliminar y exportar corresponden
a las operaciones 1, 2, 3 y 4. Si la opción no existe o la caché no puede
renovarse, las mutaciones se deniegan localmente. Los permisos explícitos del
toolbar solo pueden restringir más; nunca ampliar lo concedido por la opción.
Las acciones personalizadas que mutan datos deben declarar, por ejemplo,
`requiredPermission: 'manage'`; las acciones de navegación o lectura pueden
omitirlo.

Esta validación mejora la experiencia offline, pero no constituye la frontera de
seguridad. NovaApi vuelve a autorizar cada elemento de `/sync/push` y rechaza el
batch completo con 403 antes de escribir si alguna operación no está permitida.
Los campos `CreateUserId`, `UpdateUserId`, `DeleteUserId` y sus fechas registran
la auditoría local; el servidor vuelve a establecer la auditoría con el usuario
autenticado al aplicar el cambio.
