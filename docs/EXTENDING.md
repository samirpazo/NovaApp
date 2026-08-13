# Extender Nova App

## Agregar una entidad sincronizable

### 1. Preparar Nova backend

La entidad debe heredar el estándar `EntityBase` y su tabla debe contener:

- `SyncId` UUID único, no nulo;
- `SyncVersion` rowversion;
- estado y auditoría comunes.

Agregar soporte en `SyncController`:

- Bootstrap.
- Pull incremental desde `SysSyncChanges`.
- validación de recurso y alcance.
- aplicación de C/U/D si es editable.
- respuesta con la entidad, no solo `true`, para devolver IDs/versiones.

No incluir stored procedures dentro de migraciones EF. Las migraciones se ejecutan únicamente con
autorización explícita del responsable del proyecto.

### 2. Crear contrato Zod

Crear un archivo por entidad:

```ts
// src/contracts/entities/MyEntity.ts
export const MyEntitySchema = EntityBaseContractSchema.extend({
  MyID: z.number().int(),
  MyName: z.string(),
});

export type MyEntity = z.infer<typeof MyEntitySchema>;
```

Exportarlo desde `src/contracts/entities/index.ts`. No agrupar entidades distintas en un único
archivo y no cambiar el nombre respecto al backend.

### 3. Registrar el recurso

En `src/contracts/sync.ts`:

1. añadir a `SYNC_RESOURCES`;
2. añadir al `SyncResourceSchema`;
3. añadir al `SyncEntityMap`;
4. declarar `ReadOnly` o `ReadWrite` en `SYNC_ACCESS`;
5. añadir variante de `SyncPullChangeSchema` con el Zod de la entidad.

La decisión ReadOnly/ReadWrite es de producto, no una consecuencia automática de que el backend
tenga Save.

### 4. Agregar tabla y migración

En `src/database/schema.ts`, usar exactamente el nombre del recurso. Incluir las columnas base y las
columnas de la entidad.

Si la app ya fue utilizada:

```ts
schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [createTable({ ... })],
    },
  ],
});
```

Luego incrementar `databaseSchema.version` a `2`.

### 5. Crear modelo WatermelonDB

```ts
export class MyEntityModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.MyEntity;

  @field('MyID') MyID: number;
  @text('MyName') MyName: string;
}
```

Registrar el modelo en `src/database/models/index.ts`.

### 6. Actualizar el change set

`createChangeSet()` en `src/sync/pull.ts` debe incluir una tabla vacía para el recurso. Los recursos
editables serán convertidos automáticamente por `pushChangesFrom`; revisar si necesitan relaciones,
orden especial o remapeo de FKs temporales en el backend.

### 7. Crear consultas y servicio local

No consultar ni escribir WatermelonDB directamente desde una pantalla. Crear una carpeta de
recurso bajo `src/features/{modulo}/{recurso}` con:

- `queries.ts` para lecturas reactivas, filtros activos y proyección a DTO;
- `service.ts` para validación, alta, edición y eliminación;
- `types.ts` para entradas y salidas sin modelos WatermelonDB;
- `index.ts` como API pública del recurso.

Lectura reactiva:

```ts
const subscription = database
  .get<MyEntityModel>(SYNC_RESOURCES.MyEntity)
  .query(Q.where('SecStatus', true))
  .observe()
  .subscribe(setRecords);
```

Alta correcta:

```ts
await database.write(async () => {
  const syncId = randomUUID();
  const temporaryId = Math.min(0, ...records.map((x) => x.MyID)) - 1;

  await collection.create((record) => {
    record._raw.id = syncId;
    record.SyncId = syncId;
    record.SyncVersion = '';
    record.MyID = temporaryId;
    // EntityBase y campos de negocio
  });
});
```

Edición correcta:

```ts
await database.write(() => model.update((record) => {
  record.MyName = value;
  record.UpdateUserId = userId;
  record.UpdateDate = new Date().toISOString();
}));
```

Eliminación correcta:

```ts
await database.write(() => model.markAsDeleted());
```

### 8. UI y navegación

- Reutilizar `NC​​rud` para listados operativos.
- Usar `readOnly` si el recurso no admite Push.
- Reutilizar componentes `NText`, `NDate`, `NSelect`.
- Añadir ruta/módulo sin crear una pantalla de presentación intermedia.
- Mantener formularios compactos y operativos.
- La pantalla no debe importar `database`, modelos WatermelonDB ni `SYNC_RESOURCES`.

### 9. Matriz mínima de pruebas

| Caso | Resultado esperado |
| --- | --- |
| Pull inicial | Registros presentes localmente |
| Crear sin red | UUID válido, ID negativo, estado `created` |
| Reiniciar app | Registro local persiste |
| Push alta | ID positivo y estado `synced` |
| Editar sin red | Estado `updated` |
| Push edición | Servidor actualizado y nueva versión local |
| Eliminar sin red | Registro queda como tombstone |
| Push eliminación | Servidor inactivo y tombstone retirado |
| Edición concurrente | Conflicto visible |
| Usar servidor | Local coincide con servidor |
| Conservar local | Servidor termina con versión local |
| Repetir Push | No duplica datos |

## Agregar relaciones offline

Las FKs enteras son problemáticas mientras los padres tienen IDs negativos. Opciones aceptables:

- crear padre e hijos en el mismo lote y remapear en NovaApi;
- almacenar además el UUID del padre localmente;
- introducir una tabla de mapeo explícita.

No sustituir silenciosamente una FK negativa por cero ni depender del orden accidental de una lista.

## Agregar selección de sucursal

Antes de exponer un selector:

1. definir dónde se obtiene la lista permitida;
2. impedir cambio con pendientes/conflictos;
3. guardar `BranchId` en `SyncConnection`;
4. reiniciar la base al cambiar alcance;
5. ejecutar bootstrap del nuevo alcance;
6. mostrar claramente la sucursal activa;
7. probar que NovaApi sea estricto y no devuelva registros de otra sucursal.

No filtrar únicamente en pantalla. El backend debe aplicar el alcance.
