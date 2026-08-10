# Nova App

Aplicación móvil y web offline-first de Nova. Está construida con Expo SDK 55, React Native,
Expo Router, React Native Reusables, NativeWind y WatermelonDB. Nova App consume una instalación
de Nova por empresa; no es una plataforma SaaS multiempresa compartida.

Nova Connect está orientado a colaboradores. Nova App, en cambio, lleva funciones del sistema
Nova al dispositivo y permite trabajar sin conexión para sincronizar después.

## Estado funcional

- Inicio de sesión contra NovaApi y conservación de acceso local si no hay red.
- Pull inicial e incremental con cursor.
- CRUD local para `GenDefinition`, `GenDefinitionDetail` y `RstBranch`.
- Consulta local de solo lectura para `RstTable`.
- Push de altas, modificaciones y eliminaciones.
- UUID estable desde el dispositivo e IDs enteros negativos temporales.
- Reconciliación de IDs enteros asignados por el servidor.
- Idempotencia del Push.
- Detección de conflictos mediante `SyncVersion`.
- Resolución manual: usar servidor o conservar local.
- Pantalla técnica con estado, cursor, conteos y conflictos.

## Lectura recomendada

1. [Contexto para IA](docs/AI-CONTEXT.md): reglas obligatorias y mapa rápido del sistema.
2. [Arquitectura](docs/ARCHITECTURE.md): capas, directorios, autenticación y base local.
3. [Sincronización](docs/SYNC.md): protocolo completo de Pull, Push, IDs y conflictos.
4. [Extender Nova App](docs/EXTENDING.md): procedimiento para agregar una entidad o pantalla.
5. [Pruebas y diagnóstico](docs/TESTING.md): casos manuales, validaciones y errores conocidos.

## Requisitos

- Node.js compatible con Expo SDK 55.
- NovaApi ejecutándose y accesible desde el dispositivo.
- Para iOS/Android, un development build; WatermelonDB no debe asumirse compatible con Expo Go.
- Xcode para iOS o Android Studio para Android cuando se pruebe de forma nativa.

Antes de modificar código relacionado con Expo, consultar la documentación exacta de
[Expo SDK 55](https://docs.expo.dev/versions/v55.0.0/), tal como exige `AGENTS.md`.

## Configuración

Crear `.env.local` a partir de `.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_PASSWORD_PEPPER=client-password-pepper
```

`EXPO_PUBLIC_API_URL` no se edita desde una pantalla: es configuración del entorno. En un
teléfono físico, `localhost` apunta al teléfono, no al equipo de desarrollo; se debe usar una
IP o nombre de host alcanzable por el dispositivo.

El pepper debe coincidir con la configuración usada por Nova Web/NovaApi para preparar la
contraseña antes del login. No guardar credenciales reales en archivos versionados.

## Ejecución

```bash
npm install
npm run web -- --port 8081
```

Comandos disponibles:

```bash
npm run start       # Development client
npm run web         # Web
npm run android     # Android
npm run ios         # iOS
npm run typecheck   # TypeScript
npm run lint        # ESLint de Expo
```

Durante el desarrollo actual:

- NovaApi: `http://localhost:8080`
- Nova App Web: `http://localhost:8081`

## Proyectos relacionados

- **Nova**: repositorio del backend NovaApi, dominios, infraestructura y Nova Web.
- **Nova Connect**: aplicación para colaboradores; comparte filosofía tecnológica, pero no el
  propósito ni necesariamente el modelo de sincronización de Nova App.

## Convenciones principales

- Los nombres de recursos son idénticos en backend, contratos y app:
  `GenDefinition`, `GenDefinitionDetail`, `RstBranch`, `RstTable`.
- Cada entidad hereda el estándar de `EntityBase`: `SyncId`, `SyncVersion`, auditoría y estado.
- El `id` interno de WatermelonDB debe ser exactamente igual a `SyncId`.
- Una alta local usa UUID definitivo e ID entero negativo temporal.
- Nunca se escribe directamente al servidor desde una pantalla CRUD; primero se guarda localmente.
- Las eliminaciones usan `markAsDeleted()`, no destrucción permanente.
- `RstTable` es de solo lectura en Nova App porque su diseño requiere una pantalla grande.

## Git

El repositorio de Nova App se inicializó antes de implementar la funcionalidad. Los cambios del
backend vinculados al protocolo se encuentran en el repositorio Nova y deben revisarse/registrarse
allí respetando los cambios preexistentes de ese repositorio.
