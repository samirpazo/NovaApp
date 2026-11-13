# Contexto para IA

Este documento es el punto de entrada para cualquier IA que trabaje en Nova App. Leer también
`AGENTS.md`, `README.md` y el documento específico del área que se va a modificar.

## Objetivo del producto

Nova App es el cliente offline-first del sistema Nova. Cada empresa instala su propia instancia de
Nova y Nova App se conecta a esa instancia. No diseñar suponiendo una única base compartida por
múltiples empresas.

Restaurante sí puede tener varias sucursales. Nova App no expone pantallas de administración de
sucursales ni mesas. `BranchId` permanece opcional para una fase posterior.

## Tecnologías fijadas

- Expo SDK 55 y React Native 0.83.
- Expo Router con rutas en `src/app`.
- TypeScript estricto.
- WatermelonDB: SQLite nativo y LokiJS/IndexedDB en web.
- Zod para validar toda respuesta y contrato de frontera.
- Zustand para sesión y estado técnico de sincronización.
- React Native Reusables, NativeWind y componentes propios `N*`.
- Lucide para iconos.

## Verificación automatizada

- `npm test` ejecuta Jest con `jest-expo` en modo serial.
- Las pruebas de contratos y servicios puros viven en `__tests__/`; agregar una prueba antes de
  modificar un comportamiento de sincronización, archivos o validación.
- Antes de cerrar un cambio de Nova App ejecutar `npm test`, `npm run typecheck` y `npm run lint`.
- Para cambios de dependencias Expo, ejecutar también `npx expo-doctor`. Actualmente deja visible una
  advertencia conocida: WatermelonDB no figura como probado para New Architecture y
  `@nozbe/simdjson` no tiene metadata en React Native Directory. No excluir ni silenciar esa alerta
  sin una validación real en dispositivos Android e iOS.

## Seguridad de datos locales

- En iOS y Android, access token, refresh token, credencial de dispositivo y sesión se guardan
  exclusivamente con Expo SecureStore. Las nuevas escrituras usan
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: no migran a otro dispositivo mediante respaldos y solo están
  disponibles cuando el dispositivo está desbloqueado.
- En web, los tokens permanecen en cookies HttpOnly administradas por NovaApi. `localStorage` solo
  conserva la sesión mínima validada por `AuthSessionSchema`; nunca debe almacenar access token ni
  refresh token. La credencial de dispositivo es exclusiva de nativo: en web el refresh token de la
  cookie ya enjoya de la ventana larga de Nova App.
- `AuthUserSchema` es una lista permitida: Zod elimina cualquier campo adicional que NovaApi envíe.
  No ampliar esa lista con documento, teléfono, dirección, datos médicos u otra información sensible
  salvo que exista una necesidad funcional explícita.
  La lista admite los datos de la persona vinculada al usuario que el backend ya envía en el login
  (`SecUserCe` / `SecUser_ByUsrName`) y que el trabajo en campo necesita: identificación
  (`PrsDocumentNumber`, `TypeDocument`, `TypeDocumentName`), contacto (`PrsPhone`) y ubicación
  administrativa (`DptName`, `PrvName`, `DtrName`, `PaiName`, `AreName`, `PstName`). Se descartan
  deliberadamente la dirección, el documento de identidad, el grupo sanguíneo, el contacto de
  emergencia, las condiciones médicas, el RUC, la fecha y el sexo, y los datos laborales del
  acuerdo. `__tests__/auth-user-profile-test.ts` fija esta frontera.
- Toda sesión recuperada del almacenamiento vuelve a validarse con Zod antes de entrar a Zustand.

No sustituir estas tecnologías sin una decisión explícita del responsable del proyecto.

## Confianza local y credencial del servidor

La app separa dos conceptos que antes se confundían. Confundirlos hacía que un dispositivo sin
red quedara inutilizable a los pocas horas.

- **Confianza local**: la presencia del documento de sesión en el almacenamiento seguro del
  dispositivo. Gobierna el acceso a la interfaz y a la base local. **No caduca por tiempo.**
- **Credencial del servidor**: el access token y su refresh. Es una caché que sirve para hablar con
  NovaApi. Si caduca o falla, la app sigue operando con los datos locales.

Consecuencias obligatorias:

- Un 4xx de autenticación **nunca** provoca el cierre de sesión local. Solo lo provoca un
  revocamiento expreso del servidor: credencial de dispositivo revocada, cuenta desactivada o
  cuenta vencida.
- `isSessionExpired` decide si hay que **renovar** la credencial, nunca si hay que cerrar sesión.
- La renovación es silenciosa y en segundo plano: access token vigente → refresh token →
  credencial de dispositivo (`POST /Token/DeviceToken/Exchange`). Es la única vía que permite
  recuperar la sesión sin contraseña tras un periodo largo sin conexión.
- `POST /Token/Session/Status` es la única fuente para distinguir “no hay red” de “la sesión
  expiró” y de “la cuenta ya no está habilitada”. No deducir esa diferencia del texto de un error.
- El guard de rutas (`AuthGate`) se basa únicamente en la confianza local. Un arranque sin red debe
  mostrar la app y los datos locales, no una pantalla de login.
- La app nunca guarda la contraseña del usuario. La credencial de dispositivo sustituye esa
  necesidad y es revocable.

Ventanas de sesión del backend (`Authentication:*`): Nova App usa `NovaAppAccessTokenMinutes`
(60), `NovaAppRefreshTokenDays` (90), `NovaAppSessionTimeoutMinutes` (43200 = 30 días deslizante)
y `NovaAppDeviceTokenDays` (180). Su sesión usa `SecSession.AppType = 3`, separado del de la web
(`1`) para que un “cerrar sesión en todas partes” de Nova Web no invalide los equipos en campo.

## Densidad de componentes

Nova App conserva la densidad visual de Nova Web. Los formularios funcionales deben construirse con
la serie `N*`, no ensamblando controles nativos directamente:

Antes de crear o rediseñar una pantalla, consultar `PRODUCT.md` para las decisiones estratégicas y
`DESIGN.md` para tokens, jerarquía, densidad, responsive y reglas visuales. Las skills compartidas
con Nova Web están bajo `.agents/skills/`; aplicar sus reglas de producto y adaptación móvil, pero no
trasladar literalmente patrones exclusivos de DOM o Next.js.

- `NText`, `NTextarea`, `NSelect`, `NSelectDefinition` y `NDate` para campos; `NSelectDefinition` observa
  `GenDefinitionDetail` local y actualiza sus opciones al sincronizar;
- `NButton` desde `@/components/forms` para acciones; admite variantes semánticas, tamaños y estado
  de carga, con altura predeterminada de 32 px;
- `NSwitch` para booleanos con tamaño consistente entre web y nativo;
- `NFormPanel` para encabezado, cierre, contenido y acciones de un formulario CRUD;
- `NCrud` para componer filtros, formulario, listado, selección, ordenamiento y paginación. El
  formulario se entrega mediante su propiedad `form`; cuando está presente, `NCrud` oculta el
  listado y lo reemplaza. Las pantallas no deben duplicar este condicional por fuera del componente.

La escala estándar es control de 32 px, texto de 12 px y label de 11 px. Una pantalla puede declarar
una variante mayor por una razón concreta, como el login, pero no debe cambiar los defaults globales.

### Mapa de componentes reutilizables

| Componente | Uso | Implementación |
|---|---|---|
| `NButton` | Acciones con variantes, tamaños y estado de carga | `src/components/forms/NButton.tsx` |
| `NText`, `NTextarea`, `NDate`, `NSelect`, `NSelectDefinition`, `NSwitch` | Campos de formularios | `src/components/forms/` |
| `NField`, `FormField`, `NFormPanel` | Labels, validación y paneles de formulario | `src/components/forms/` |
| `NCrud` | CRUD offline con filtros, formulario, acciones y paginación | `src/components/crud/offline-crud.tsx` |
| `NCrudTable` | Tabla responsive genérica usada por `NCrud` | `src/components/crud/n-crud-table.tsx` |
| `NCrudDataSource` | Lectura paginada/filtrada desde una fuente | `src/components/crud/contracts.ts` |
| `NSignature` | Captura y reemplazo de firma | `src/components/forms/NSignature.tsx` |
| `NSyncConnectionNotice` | Aviso no bloqueante de sincronización detenida | `src/components/sync/sync-connection-notice.tsx` |

La app no tiene un componente independiente llamado `NTable`: las pantallas estándar usan
`NCrudTable` dentro de `NCrud`. Antes de agregar variantes o props, leer los tipos de la
implementación; no copiar APIs de Nova Web si la implementación nativa tiene otro contrato.

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
17. Todo listado NCrud debe usar `NCrudDataSource`. No cargar una colección completa en estado React
    para entregarla mediante `rows`; los selectores auxiliares sí pueden observar su propio catálogo.
18. La confianza local del dispositivo no caduca por tiempo. Un fallo de autenticación del servidor
    degrada la sincronización, nunca el acceso a los datos locales.
19. La renovación de la credencial del servidor ocurre en segundo plano y nunca bloquea el arranque
    de la app.
20. El cierre de sesión es la única acción del usuario que elimina la credencial del dispositivo.
    Ni un fallo de red ni uno de autenticación borran datos locales.
21. Una carga de archivo lleva siempre el identificador estable que el cliente guarda en la copia
    local (`uploadId`). El servidor lo usa para deduplicar; no se debe volver a depender de la
    huella del cuerpo multipart para idempotencia.

## Estado de recursos

| Recurso               | Acceso            | ID entero | Alcance                         |
| --------------------- | ----------------- | --------- | ------------------------------- |
| `GenDefinition`       | Solo lectura      | `DefID`   | General                         |
| `GenDefinitionDetail` | Solo lectura      | `DedID`   | General                         |
| `OagTechnicalVisitSchedule` | Lectura/escritura | `TvsID` | Supervisor autenticado (`PrsID`) |
| `OagTechnicalVisit`   | Lectura/escritura | `TviID`   | Aggregate de su programación asignada |
| `GenCampaign` | Solo lectura | `CmpID` | Campañas de la instalación |
| `OagFruitFarm` | Solo lectura | `FrfID` | Fundos asignados al supervisor |
| `OagPlotFarm` | Solo lectura | `PlfID` | Lotes de fundos asignados |
| `OagFruitFarmSupervisor` | Solo lectura | `FfsID` | Asignaciones vigentes del supervisor |
| `OagCultive`, `OagVariety` | Solo lectura | `CltID`, `VrtID` | Cultivos/variedades de los lotes asignados |
| `OagFarmSupplies` | Solo lectura | `FrsID` | Insumos de objetivos asociados a cultivos asignados |
| `OagFarmSuppliesTarget` | Solo lectura | `FstID` | Objetivos de insumos para cultivos asignados |
| `OagObjective`, `OagObjectiveCultive` | Solo lectura | `ObjID`, `OjcID` | Objetivos agronómicos y relaciones con cultivos asignados |
| `OagWaterSource` | Solo lectura | `OwsID` | Fuentes de agua de lotes asignados |

Las definiciones son catálogo de solo lectura en la app móvil: se descargan para alimentar los
selectores de la visita técnica, pero la app no las edita ni las empuja. NovaApi entrega el
catálogo con cualquiera de los permisos `GEN_DEFINITIONS` u `OAG_TECHNICAL_VISIT`, para que los
selectores no queden vacíos en campo. Si una instalación heredada arrastra cambios locales sobre
esos catálogos, la sincronización los descarta y repone la versión oficial: los restos nunca
bloquean el Push de las visitas técnicas.

Nota sobre Restaurant: la integración de Restaurant (`RstBranch`, `RstTable`) con Sync fue una
implementación experimental y fue completamente retirada, también del contrato local de la app. No
existen en `/sync/pull` ni en `/sync/push`.

## Archivos clave

- `src/contracts/sync.ts`: recursos, acceso y esquemas Pull/Push/conflicto.
- `src/contracts/entities/`: un contrato Zod por entidad.
- `src/contracts/entities/operationsagr/`: contratos de la visita y sus secciones.
- `src/database/schema.ts`: esquema local.
- `src/database/models/`: modelos WatermelonDB.
- `src/sync/pull.ts`: orquestación Pull + Push + reconciliación.
- `src/sync/read-only-conflict.ts`: el servidor gana los conflictos de los catálogos de solo lectura.
- `src/sync/read-only-discard.ts`: detección y descarte de restos locales heredados.
- `src/sync/conflicts.ts`: persistencia y resolución de conflictos.
- `src/sync/useSyncIndicators.ts`: conteos reactivos locales para badges de cambios y conflictos.
- `src/sync/config.ts`: URL, tokens y credencial de dispositivo.
- `src/sync/scheduler.ts`: sincronización en segundo plano (primer plano, conectividad, temporizador).
- `src/sync/background-task.ts`: tarea en segundo plano del sistema operativo.
- `src/sync/headless.ts`: activación de la cuenta sin React, para la tarea en segundo plano.
- `src/sync/backup.ts`: respaldo de los cambios locales pendientes.
- `src/auth/service.ts`: login, renovación de credencial y clasificación de fallos.
- `src/lib/person-photo.ts`: foto de la cuenta y de cualquier persona, cacheada en el ámbito local.
- `src/auth/store.ts`: confianza local, estado de credencial y bloqueo de sincronización.
- `src/components/crud/offline-crud.tsx`: listado CRUD reutilizable.
- `src/components/sync/conflict-comparison.tsx`: comparación responsive entre versión local y
  versión del servidor.
- `src/components/sync/sync-connection-notice.tsx`: aviso no bloqueante de sincronización detenida.
- `src/app/(tabs)/_layout.tsx`: shell autenticado con header y cinco tabs.
- `src/features/security/options/`: consulta y caché local del menú móvil autorizado.
- `src/lib/optionIcon.ts`: resuelve dinámicamente `OptIcon` usando las exportaciones Lucide de Nova App.
- `src/app/(tabs)/sync-details.tsx`: pantalla técnica de sincronización.
- `src/app/(tabs)/conflict-resolution.tsx`: resolución manual.
- `src/app/(tabs)/technical-visits.tsx` y `technical-visit-detail.tsx`: visitas técnicas offline; alta en memoria hasta «Guardar cambios», GPS automático de solo lectura con Expo Location.
- `docs/TECHNICAL-VISITS-OFFLINE-READINESS.md`: inventario de tablas/catálogos y fases para
  completar visitas técnicas offline con paridad funcional con Nova Web.
- `docs/OFFLINE-READINESS.md`: garantías, matriz de fallos y límites del trabajo sin conexión.

Todas las pantallas autenticadas deben vivir dentro de `src/app/(tabs)/`, incluso cuando no sean
una de las cinco pestañas principales. Las rutas secundarias se registran con `href: null` en el
layout para conservar siempre el header y la barra inferior sin añadir botones nuevos. `login.tsx`
es la única pantalla funcional que permanece fuera del shell autenticado.

Backend relacionado:

- `NovaApi/Controllers/Sync/SyncController.cs`
- `NovaApi/Models/Sync/SyncPushRequest.cs`
- `NovaApi/Middleware/IdempotencyMiddleware.cs`
- `NovaApi/Controllers/Security/TokenController.cs` (login, refresh, credencial de dispositivo, estado)
- `NovaApi/Services/Auth/ClientSessionPolicy.cs` (ventanas de sesión por tipo de cliente)
- `NovaApi/Middleware/SessionValidationMiddleware.cs` (validación de sesión por tipo de cliente)

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
- arranque sin red con la sesión local intacta;
- renovación silenciosa de la credencial cuando vuelve la conectividad;
- lint, typecheck y compilación backend limpios.
