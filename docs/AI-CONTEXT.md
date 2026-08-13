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

## Densidad de componentes

Nova App conserva la densidad visual de Nova Web. Los formularios funcionales deben construirse con
la serie `N*`, no ensamblando controles nativos directamente:

Antes de crear o rediseñar una pantalla, consultar `PRODUCT.md` para las decisiones estratégicas y
`DESIGN.md` para tokens, jerarquía, densidad, responsive y reglas visuales. Las skills compartidas
con Nova Web están bajo `.agents/skills/`; aplicar sus reglas de producto y adaptación móvil, pero no
trasladar literalmente patrones exclusivos de DOM o Next.js.

- `NText`, `NSelect` y `NDate` para campos;
- `NSwitch` para booleanos con tamaño consistente entre web y nativo;
- `NFormPanel` para encabezado, cierre, contenido y acciones de un formulario CRUD;
- `NCrud` para componer filtros, formulario, listado, selección, ordenamiento y paginación. El
  formulario se entrega mediante su propiedad `form`; cuando está presente, `NCrud` oculta el
  listado y lo reemplaza. Las pantallas no deben duplicar este condicional por fuera del componente.

La escala estándar es control de 32 px, texto de 12 px y label de 11 px. Una pantalla puede declarar
una variante mayor por una razón concreta, como el login, pero no debe cambiar los defaults globales.

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
16. Las consultas funcionales deben filtrar `SecStatus = true`. Los registros con eliminación
    lógica pueden conservarse localmente para sincronización, pero no deben aparecer en listados,
    selectores ni relaciones activas.

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
- `src/components/sync/conflict-comparison.tsx`: comparación responsive entre versión local y
  versión del servidor.
- `src/app/(tabs)/_layout.tsx`: shell autenticado con header y cinco tabs.
- `src/features/security/options/`: consulta y caché local del menú móvil autorizado.
- `src/app/(tabs)/sync-details.tsx`: pantalla técnica de sincronización.
- `src/app/(tabs)/conflict-resolution.tsx`: resolución manual.

Todas las pantallas autenticadas deben vivir dentro de `src/app/(tabs)/`, incluso cuando no sean
una de las cinco pestañas principales. Las rutas secundarias se registran con `href: null` en el
layout para conservar siempre el header y la barra inferior sin añadir botones nuevos. `login.tsx`
es la única pantalla funcional que permanece fuera del shell autenticado.

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

## Opciones de navegación móvil

Nova App no replica todo el menú de Nova Web. `SecOption.OptIsMobile` define qué opciones finales
pueden aparecer en la app y se administra desde `Seguridad > Opciones` en Nova Web.

- La app consulta `GET /SecUser/MyOptions?mobileOnly=true` con la sesión actual.
- NovaApi aplica primero los permisos del usuario y luego el filtro móvil.
- Los menús ancestros necesarios se incluyen como contenedores aunque no estén marcados, pero solo
  las opciones `TypeOption = 2` con `OptIsMobile = true` se muestran como destinos.
- El árbol validado con Zod se guarda en WatermelonDB con una clave aislada por `UsrID`. La pantalla
  lee primero esa caché y la muestra inmediatamente; después actualiza permisos en segundo plano.
  Una falla de red no debe ocultar un menú local válido ni mostrar un error bloqueante. El botón de
  actualizar sí fuerza una consulta visible. Nunca reutilizar una caché global o perteneciente a
  otro usuario, aunque eso implique una primera carga en línea para una cuenta nueva.
- Una opción nueva requiere además registrar su `OptCode` en el archivo del módulo bajo
  `src/lib/routes/`; `src/lib/routeMapping.ts` compone el mapa central. Una opción sin ruta se
  muestra deshabilitada y nunca intenta navegar a una pantalla inexistente.

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
