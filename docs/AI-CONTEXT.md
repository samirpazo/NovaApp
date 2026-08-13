# Contexto para IA

Este documento es el punto de entrada para cualquier IA que trabaje en Nova App. Leer también
`AGENTS.md`, `README.md` y el documento específico del área que se va a modificar.

## Objetivo del producto

Nova App es el cliente offline-first del sistema Nova. Cada empresa instala su propia instancia de
Nova y Nova App se conecta a esa instancia. No diseñar suponiendo una única base compartida por
múltiples empresas.

Restaurante sí puede tener varias sucursales. Por el momento no se obliga al usuario a seleccionar
una sucursal en Nova App. `BranchId` está preparado como opcional para una fase posterior.

## Tecnologías fijadas

- Expo SDK 55 y React Native 0.83.
- Expo Router con rutas en `src/app`.
- TypeScript estricto.
- WatermelonDB: SQLite nativo y LokiJS/IndexedDB en web.
- Zod para validar toda respuesta y contrato de frontera.
- Zustand para sesión y estado técnico de sincronización.
- React Native Reusables, NativeWind y componentes propios `N*`.
- Lucide para iconos.

## Seguridad de datos locales

- En iOS y Android, access token, refresh token y sesión se guardan exclusivamente con Expo
  SecureStore. Las nuevas escrituras usan `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: no migran a otro
  dispositivo mediante respaldos y solo están disponibles cuando el dispositivo está desbloqueado.
- En web, los tokens permanecen en cookies HttpOnly administradas por NovaApi. `localStorage` solo
  conserva la sesión mínima validada por `AuthSessionSchema`; nunca debe almacenar access token ni
  refresh token.
- `AuthUserSchema` es una lista permitida: Zod elimina cualquier campo adicional que NovaApi envíe.
  No ampliar esa lista con documento, teléfono, dirección, datos médicos u otra información sensible
  salvo que exista una necesidad funcional explícita.
- Toda sesión recuperada del almacenamiento vuelve a validarse con Zod antes de entrar a Zustand.

No sustituir estas tecnologías sin una decisión explícita del responsable del proyecto.

## Invariantes que no se deben romper

1. `record.id === record.SyncId` para toda entidad sincronizable.
2. `SyncId` es un UUID generado una sola vez y nunca cambia.
3. El ID entero de dominio puede ser negativo solo mientras el registro es local.
4. El servidor es dueño del ID entero positivo y de `SyncVersion`.
5. `SyncVersion` es el rowversion del servidor codificado en Base64.
6. Toda edición se guarda primero en WatermelonDB, incluso estando en línea.
7. Toda operación WatermelonDB de escritura debe estar dentro de `database.write`.
8. Las eliminaciones sincronizables se hacen con `markAsDeleted()`.
9. Un recurso `ReadOnly` nunca debe producir cambios locales para Push.
10. El Pull debe conservar el `SyncVersion` local cuando `_status !== 'synced'`; de otro modo se
    oculta un conflicto antes del Push.
11. Un conflicto no se resuelve automáticamente. El usuario elige servidor o local.
12. `Force` solo se usa después de la decisión explícita “Conservar local”.
13. Un conflicto pendiente debe aparecer en `experimentalRejectedIds` para que WatermelonDB no lo
    marque como sincronizado.
14. Los nombres de recursos deben coincidir exactamente entre todos los proyectos; no pluralizar.
15. Los datos recibidos del servidor deben pasar por Zod antes de llegar a WatermelonDB.

## Estado de recursos

| Recurso | Acceso | ID entero | Alcance |
| --- | --- | --- | --- |
| `GenDefinition` | Lectura/escritura | `DefID` | General |
| `GenDefinitionDetail` | Lectura/escritura | `DedID` | General |
| `RstBranch` | Lectura/escritura | `BrhID` | Restaurante |
| `RstTable` | Solo lectura | `TabID` | Sucursal cuando haya `BranchId` |

`RstTable` no debe volverse editable en móvil: el diseñador de restaurante está reservado para
Nova Web y requiere una pantalla grande.

## Archivos clave

- `src/contracts/sync.ts`: recursos, acceso y esquemas Pull/Push/conflicto.
- `src/contracts/entities/`: un contrato Zod por entidad.
- `src/database/schema.ts`: esquema local.
- `src/database/models/`: modelos WatermelonDB.
- `src/sync/pull.ts`: orquestación Pull + Push + reconciliación.
- `src/sync/conflicts.ts`: persistencia y resolución de conflictos.
- `src/sync/config.ts`: URL y futuro alcance de sucursal.
- `src/components/crud/offline-crud.tsx`: listado CRUD reutilizable.
- `src/app/explore.tsx`: pantalla técnica de sincronización.
- `src/app/conflicts.tsx`: resolución manual.

Backend relacionado:

- `NovaApi/Controllers/Sync/SyncController.cs`
- `NovaApi/Models/Sync/SyncPushRequest.cs`
- `NovaApi/Middleware/IdempotencyMiddleware.cs`

## Cómo crear una entidad local nueva

No empezar por la pantalla. Seguir este orden:

1. Confirmar que la entidad backend hereda `EntityBase` y tiene UUID/rowversion funcionando.
2. Confirmar que Pull y Push backend soportan el recurso y su alcance.
3. Crear el contrato Zod en un archivo propio.
4. Registrar nombre y acceso en `SYNC_RESOURCES` y `SYNC_ACCESS`.
5. Agregar schema, migración y modelo WatermelonDB.
6. Agregar mapeo de Pull/Push.
7. Crear repositorio/hook o pantalla local.
8. Probar alta, edición, eliminación, reconciliación y conflicto.

Consultar [EXTENDING.md](EXTENDING.md) para el procedimiento completo.

## Criterio de terminado

Una funcionalidad offline-first no está terminada solo porque guarda localmente. Debe demostrar:

- funcionamiento sin red;
- persistencia tras cerrar/reabrir;
- Push idempotente;
- reconciliación sin duplicados;
- Pull incremental;
- conflicto en edición concurrente;
- ambas decisiones de conflicto;
- lint, typecheck y compilación backend limpios.
