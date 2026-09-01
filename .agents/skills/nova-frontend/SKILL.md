# Nova Frontend — Patrones y Arquitectura

## 1. Sistema de Autenticación

### 1.1 JWT vía Cookies HttpOnly (No Response Body)

El login/refresh NO devuelve `Token` ni `RefreshToken` en el body. El backend establece cookies HttpOnly con `SameSite=Strict`. El frontend usa `withCredentials: true` en axios y SignalR.

```typescript
// lib/axios.ts — configuración global
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});
```

### 1.2 Password Hashing del Lado del Cliente

`src/lib/security.ts::hashPassword` aplica SHA512 con client pepper antes de enviar — nunca viaja texto plano.

```typescript
const PASSWORD_PEPPER =
  process.env.NEXT_PUBLIC_PASSWORD_PEPPER ?? 'your-pepper-value-here';
export const hashPassword = (password: string): string => {
  const hash = CryptoJS.SHA512(password + PASSWORD_PEPPER);
  return hash.toString(CryptoJS.enc.Hex);
};
```

Usar siempre en formularios de login/cambio de contraseña:

```typescript
import { hashPassword } from '@/lib/security';
const hashedPassword = hashPassword(password);
```

### 1.3 Auth Guard — Verificación en Dos Fases

`src/components/auth/AuthGuard.tsx` implementa verificación pesada SOLO al montar el componente, con validación ligera en cambios de ruta.

**Fase 1 (Montaje — con spinner):**

- Verifica token (refresh si expiró).
- Carga permisos vía `fetchPermissions()`.
- Valida la ruta actual contra los permisos cargados.

**Fase 2 (Cambio de ruta — sin spinner):**

- `useEffect` dependiente de `pathname` e `initialized`.
- Solo ejecuta `validateRoute()` contra permisos ya en memoria.

**Uso en layout:**

```tsx
// src/app/(dashboard)/layout.tsx
// NO usar key={pathname} en AuthGuard — causaría remontaje completo
<AuthGuard>
  <Sidebar />
  {children}
</AuthGuard>
```

### 1.4 Zustand + Persist — Auth Store

`src/stores/authStore.ts` usa zustand con middleware `persist`. El estado parcial (`user`, `isAuthenticated`) se persiste en localStorage.

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'nova-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 1.5 Sanitize User — PII Fuera de localStorage

`secAuthService.sanitizeUser()` elimina datos sensibles antes de persistir:

```typescript
sanitizeUser(user: UserInfo): UserInfo {
  return {
    ...user,
    PrsDocumentNumber: undefined,  // DNI eliminado
    PrsBirthDay: undefined,        // Fecha de nacimiento eliminada
    PrsPhone: undefined,           // Teléfono eliminado
  };
}
```

Se llama en `authStore.login()` y `authStore.checkAuth()` antes de `set()`.

### 1.6 SignalR con Cookies

Session hub se inicia tras login exitoso:

```typescript
await sessionHub.startConnection(); // usa withCredentials
```

---

## 2. Componentes N-Series (Obligatorios)

### 2.1 Regla General

> **SIEMPRE** priorizar componentes N-Series sobre componentes base `ui/`. Los N-Series encapsulan la identidad visual de Nova: bordes sutiles, fondos con desenfoque (`backdrop-blur`), densos pero elegantes.

Importar desde `@/components/custom/`:

```tsx
import { NText } from '@/components/custom/NText';
import { NSelectDefinition } from '@/components/custom/NSelectDefinition';
import { NDate } from '@/components/custom/NDate';
```

### 2.2 Listado Completo de Componentes N-Series

| Componente                 | Ubicación                      | Propósito                                                           |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `NText`                    | `NText.tsx`                    | Texto con formato estilizado (etiquetas, valores, metadata)         |
| `NTextarea`                | `NTextarea.tsx`                | Área de texto con estilo N                                          |
| `NSelect`                  | `NSelect.tsx`                  | Select nativo, reemplaza a `ui/select`                              |
| `NSelectDefinition`        | `NSelectDefinition.tsx`        | Select para tablas de definición (`GenDefinitionDetail`)            |
| `NSelectMasterDefinition`  | `NSelectMasterDefinition.tsx`  | Select para definiciones maestras agrupadas                         |
| `NSelectDefinitionGroup`   | `NSelectDefinitionGroup.tsx`   | Select para grupos de definición                                    |
| `NSelectPerson`            | `NSelectPerson.tsx`            | Select para búsqueda de personas (`GenPerson`)                      |
| `NSelectUser`              | `NSelectUser.tsx`              | Select para búsqueda de usuarios (`SecUser`)                        |
| `NSelectAccount`           | `NSelectAccount.tsx`           | Select para cuentas contables                                       |
| `NSelectBusinessPartner`   | `NSelectBusinessPartner.tsx`   | Select para socios de negocio                                       |
| `NSelectBusinessLine`      | `NSelectBusinessLine.tsx`      | Select para líneas de negocio                                       |
| `NSelectArticle`           | `NSelectArticle.tsx`           | Select para artículos/productos                                     |
| `NSelectCostCenter`        | `NSelectCostCenter.tsx`        | Select para centros de costo                                        |
| `NSelectCampaign`          | `NSelectCampaign.tsx`          | Select para campañas                                                |
| `NSelectProject`           | `NSelectProject.tsx`           | Select para proyectos                                               |
| `NSelectAgreement`         | `NSelectAgreement.tsx`         | Select para contratos                                               |
| `NSelectArea`              | `NSelectArea.tsx`              | Select para áreas                                                   |
| `NSelectDepartment`        | `NSelectDepartment.tsx`        | Select para departamentos (Ubigeo)                                  |
| `NSelectProvince`          | `NSelectProvince.tsx`          | Select para provincias (Ubigeo)                                     |
| `NSelectDistrict`          | `NSelectDistrict.tsx`          | Select para distritos (Ubigeo)                                      |
| `NSelectPosition`          | `NSelectPosition.tsx`          | Select para cargos                                                  |
| `NSelectCountry`           | `NSelectCountry.tsx`           | Select para países                                                  |
| `NSelectPeriod`            | `NSelectPeriod.tsx`            | Select para periodos contables                                      |
| `NSelectBoolean`           | `NSelectBoolean.tsx`           | Select para valores booleano (Sí/No)                                |
| `NSelectDocProcessingRule` | `NSelectDocProcessingRule.tsx` | Select para reglas de procesamiento documental                      |
| `NComboSearch`             | `NComboSearch.tsx`             | Combo con búsqueda typeahead genérica                               |
| `NDate`                    | `NDate.tsx`                    | Selector de fecha                                                   |
| `NMonth`                   | `NMonth.tsx`                   | Selector de mes                                                     |
| `NWeek`                    | `NWeek.tsx`                    | Selector de semana                                                  |
| `NYear`                    | `NYear.tsx`                    | Selector de año                                                     |
| `NButton`                  | `NButton.tsx`                  | Botón con estilos N, reemplaza a `ui/button` en layouts densos      |
| `NSwitch`                  | `NSwitch.tsx`                  | Toggle switch estilizado                                            |
| `NBadge`                   | `NBadge.tsx`                   | Badge con variantes de color por estado                             |
| `NStatusIndicator`         | `NStatusIndicator.tsx`         | Indicador de estado con punto de color                              |
| `NTable`                   | `NTable.tsx`                   | Tabla optimizada con dense mode, scroll, estilos N                  |
| `NBentoGrid`               | `NBentoGrid.tsx`               | Grid tipo bento para dashboards                                     |
| `NStatCard`                | `NStatCard.tsx`                | Tarjeta de estadística con métrica y etiqueta                       |
| `NMetricCard`              | `NMetricCard.tsx`              | Tarjeta de métrica con variante compacta                            |
| `NDataChart`               | `NDataChart.tsx`               | Contenedor para gráficos (Chart.js)                                 |
| `NSteps`                   | `NSteps.tsx`                   | Indicador de progreso por pasos                                     |
| `NTimeline`                | `NTimeline.tsx`                | Línea de tiempo vertical                                            |
| `NAlert`                   | `NAlert.tsx`                   | Alerta con variantes (info, success, warning, error)                |
| `NEmptyState`              | `NEmptyState.tsx`              | Estado vacío con icono y mensaje                                    |
| `NCodeBlock`               | `NCodeBlock.tsx`               | Bloque de código con resaltado (único lugar donde usar `font-mono`) |
| `NJsonEditor`              | `NJsonEditor.tsx`              | Editor JSON con validación                                          |
| `NFile`                    | `NFile.tsx`                    | Visor/file preview genérico                                         |
| `NFileGallery`             | `NFileGallery.tsx`             | Galería de archivos con grid                                        |
| `NImage`                   | `NImage.tsx`                   | Imagen optimizada con fallback                                      |
| `NImportExcel`             | `NImportExcel.tsx`             | Modal de importación Excel                                          |
| `NSignature`               | `NSignature.tsx`               | Captura de firma digital                                            |
| `NArticleModal`            | `NArticleModal.tsx`            | Modal de búsqueda de artículos                                      |
| `NAccountModal`            | `NAccountModal.tsx`            | Modal de búsqueda de cuentas                                        |
| `NBusinessPartnerModal`    | `NBusinessPartnerModal.tsx`    | Modal de búsqueda de socios de negocio                              |
| `NQualityRating`           | `NQualityRating.tsx`           | Rating de calidad con estrellas                                     |
| `NQRCode`                  | `NQRCode.tsx`                  | Generador de QR                                                     |
| `NBarcode`                 | `NBarcode.tsx`                 | Generador de código de barras                                       |
| `NGauge`                   | `NGauge.tsx`                   | Medidor circular                                                    |
| `NAvatarGroup`             | `NAvatarGroup.tsx`             | Grupo de avatares superpuestos                                      |
| `NSkeleton`                | `NSkeleton.tsx`                | Skeleton loaders con variantes N                                    |
| `NGrid`                    | `NGrid.tsx`                    | **Sistema de grillas obligatorio** — exporta `NRow` y `NCol`        |
| `DynamicIcon`              | `dashboard/dynamic-icon.tsx`   | Resolución de iconos Lucide por nombre string                       |

### 2.2.1 Componentes Genéricos Adicionales

| Componente          | Ubicación               | Propósito                                                                              |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `FilePreviewDialog` | `FilePreviewDialog.tsx` | Dialog de previsualización de archivos (HTML, imágenes, etc.)                          |
| `NSelectUbigeo`     | `NSelectUbigeo.tsx`     | Selector unificado de ubigeo (reemplaza Department/Province/District en nuevos flujos) |

### 2.2.2 Componentes por Módulo (operationsagr/)

> Estos componentes viven en `operationsagr/` y son específicos del módulo MENU_OA.

| Componente                   | Propósito                                    |
| ---------------------------- | -------------------------------------------- |
| `NSelectIntakeScheduleLoose` | Select para programación de ingresos sueltos |
| `NSelectPlotFarm`            | Select para parcelas de fundo                |
| `NSelectProducer`            | Select para productores                      |
| `NSelectVariety`             | Select para variedades agrícolas             |
| `NSelectSubZon`              | Select para sub-zonas                        |
| `NSelectZon`                 | Select para zonas                            |
| `NSelectTravelInProcess`     | Select para traslados en proceso             |

### 2.2.3 Componentes por Módulo (supplychain/)

> Estos componentes viven en `supplychain/` y son específicos del módulo SUPPLYCHAIN.

| Componente       | Propósito                  |
| ---------------- | -------------------------- |
| `NSelectCarrier` | Select para transportistas |
| `NSelectVehicle` | Select para vehículos      |

### 2.2.4 Componentes por Módulo (restaurant/)

> Estos componentes viven en `restaurant/` y son específicos del módulo RESTAURANT.

| Componente                            | Propósito                                |
| ------------------------------------- | ---------------------------------------- |
| `NSelectRestaurantBranch`             | Select para sucursales de restaurante    |
| `NSelectRestaurantBusinessHour`       | Select para horarios de negocio          |
| `NSelectRestaurantDailyProgram`       | Select para programas diarios            |
| `NSelectRestaurantDailyProgramDetail` | Select para detalle de programas diarios |
| `NSelectRestaurantKitchenStation`     | Select para estaciones de cocina         |
| `NSelectRestaurantOffer`              | Select para ofertas                      |
| `NSelectRestaurantOfferGroup`         | Select para grupos de ofertas            |
| `NSelectRestaurantProduct`            | Select para productos de restaurante     |
| `NSelectRestaurantProductCategory`    | Select para categorías de productos      |
| `NSelectRestaurantSalesChannel`       | Select para canales de venta             |
| `NSelectRestaurantShift`              | Select para turnos                       |

### 2.3 NGrid — Layout (Obligatorio)

> **PROHIBIDO** usar `grid`, `grid-cols-*`, `gap-*` de Tailwind en contenedores `div`. Usar siempre `NRow` + `NCol`.

```tsx
import { NRow, NCol } from '@/components/custom/NGrid';

<NRow>
  <NCol span={6}>
    <NText
      label="RUC"
      value="20567890123"
    />
  </NCol>
  <NCol span={6}>
    <NText
      label="Razón Social"
      value="NOVA S.A.C."
    />
  </NCol>
</NRow>;
```

### 2.4 NCodeBlock — Única Excepción para font-mono

El único lugar donde se permite `font-mono` es en `NCodeBlock`. Para IDs, códigos de opción, timestamps usar Poppins `font-semibold` + `tracking-tight`.

### 2.5 DynamicIcon — Resolución de Iconos Lucide

`src/components/dashboard/dynamic-icon.tsx` resuelve iconos de lucide-react por nombre (string) usando forwardRef lookup.

```tsx
import { DynamicIcon } from '@/components/dashboard/dynamic-icon';

<DynamicIcon name="Users" className="size-5" strokeWidth={2} />
<DynamicIcon name="Settings" className="size-4" fallback={<CustomFallback />} />
```

- Cache interno (`iconCache` Map) para evitar búsqueda repetida.
- Normaliza nombres (guiones/espacios → lookup lowercase).
- Compatible con lucide-react v1.x (iconos como forwardRef objects).

**Uso típico:** Sidebar (íconos de módulos desde `options-config.ts`), QueryManager Show (íconos de categorías desde `OptIcon` en `SecOption`).

### 2.6 DOMPurify — Sanitización de HTML

Para cualquier `dangerouslySetInnerHTML`, usar DOMPurify:

```typescript
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
```

Aplicado en `FilePreviewDialog.tsx` para previsualización de HTML.

---

## 3. QueryManager — Patrones de Rendimiento

### 3.1 Batch SQL

Endpoint `POST /QrmQuery/ExecuteSQLBatch` ejecuta N consultas en una sola llamada para precarga de opciones dinámicas (parámetros tipo 6).

```typescript
// Frontend — agrupa SQLs dinámicas y las envía en batch
const results = await qrmqueryService.executeSQLBatch(
  dynamicParams.map((p) => p.QrpQuerySql!),
);
```

### 3.2 Caché con useRef

Opciones dinámicas cacheadas en `useRef` para evitar recargas en navegación entre queries:

```typescript
const dynamicOptionsCache = useRef<Record<string, Record<number, any[]>>>({});
// key: `${qryNameSp}_${qryDatabase}`, value: { [paramId]: options[] }
```

### 3.3 Skeleton en Carga

Tres categorías skeleton con 2 items cada una mientras se resuelve `GetAuthorizedQueries`:

```tsx
{isLoading ? (
  Array.from({ length: 3 }).map((_, i) => (
    <div key={i} className="space-y-2">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 2 }).map((_, j) => (
        <Skeleton key={j} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  ))
) : (
  // Queries reales con DynamicIcon y categorización
)}
```

### 3.4 OptIcon desde SecOption

El SP `QrmQuery_Authorized` retorna `o.OptIcon` de `SecOption`. El frontend renderiza con `<DynamicIcon>`:

```tsx
<DynamicIcon
  name={groupedQueries[category][0]?.OptIcon}
  className="size-5"
/>
```

---

## 4. Convenciones de Código

### 4.1 Servicios API

Seguir el patrón de `genericService` + métodos específicos:

```typescript
import { api } from '@/lib/axios';
import { genericService } from '@/services/common/scrudService';

const baseService = genericService<T>(controller);
export const myService = {
  ...baseService,
  async customMethod(params): Promise<any> {
    const { data } = await api.post(`/${controller}/Action`, params);
    return data;
  },
};
```

### 4.2 Formatters — Única Puerta de Formateo

> **OBLIGATORIO**: Todas las conversiones de moneda, decimal, fecha, hora y porcentaje DEBEN usar `formatters` de `@/lib/formatter.ts`. Prohibido usar `Intl.NumberFormat`, `Date` nativo, o funciones inline.

```typescript
import { formatters } from '@/lib/formatter';
```

#### Métodos Disponibles

| Método       | Firma                                                       | Ejemplo                                                           |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `currency`   | `(value, currency='PEN', locale='es-PE', display='symbol')` | `formatters.currency(1234.56)` → `S/ 1,234.56`                    |
| `decimal`    | `(value, decimals=2, locale='es-PE')`                       | `formatters.decimal(1234.5)` → `1,234.50`                         |
| `number`     | `(value, locale='es-PE')`                                   | `formatters.number(1234)` → `1,234`                               |
| `percentage` | `(value, decimals=2, locale='es-PE')`                       | `formatters.percentage(15)` → `15.00%`                            |
| `date`       | `(value, format='dd/MM/yyyy', fromUtc=true)`                | `formatters.date("2026-06-27T00:00:00")` → `27/06/2026`           |
| `datetime`   | `(value, format='dd/MM/yyyy HH:mm', fromUtc=true)`          | `formatters.datetime("2026-06-27T15:30:00")` → `27/06/2026 15:30` |
| `time`       | `(value, format='HH:mm', fromUtc=true)`                     | `formatters.time("2026-06-27T15:30:00")` → `15:30`                |
| `trim`       | `(str)`                                                     | `formatters.trim("  text  ")` → `text`                            |

#### Manejo de UTC (fromUtc)

Los métodos `date`, `datetime` y `time` tienen el flag `fromUtc` activado por defecto. Si el string ISO no termina en `Z` ni incluye offset (`+`), automáticamente lo trata como UTC:

```typescript
// API devuelve "2026-06-27T15:30:00" sin Z — fromUtc=true lo interpreta como UTC
formatters.date('2026-06-27T15:30:00'); // 27/06/2026
formatters.datetime('2026-06-27T15:30:00'); // 27/06/2026 15:30

// Para fechas con offset explícito, fromUtc no interfiere
formatters.date('2026-06-27T00:00:00-05:00', 'dd/MM/yyyy', false); // 27/06/2026
```

#### Currency con ISO o Símbolo Libre

Soporta códigos ISO (`PEN`, `USD`, `EUR`) y también símbolos libres:

```typescript
formatters.currency(1234.56, 'PEN'); // S/ 1,234.56
formatters.currency(1234.56, 'USD'); // $ 1,234.56
formatters.currency(1234.56, 'Bs.'); // Bs. 1,234.56  (símbolo libre)
```

---

### 4.3 React Doctor — Pre-commit Quality Gate

Antes de cada commit con cambios en React, ejecutar:

```bash
npx -y react-doctor@latest . --verbose --diff
```

Si el score baja respecto al baseline, corregir las regresiones antes de commitear. Para scan completo del codebase (sin `--diff`):

```bash
npx -y react-doctor@latest . --verbose
```

### 4.4 Quality Gate — Obligatorio antes de entregar

> **Toda IA DEBE ejecutar estos comandos después de modificar código TypeScript/TSX.** No entregar cambios sin verificar que pasan.

```bash
# 1. Verificar tipos (compilación sin emitir archivos)
npx tsc --noEmit

# 2. Lint (ESLint + next/core-web-vitals + typescript)
npm run lint

# 3. Formato (Prettier — verificar sin escribir)
npx prettier --check .
```

Si `prettier --check` reporta archivos con formato incorrecto, corregir con:

```bash
npx prettier --write .
```

**Regla**: Si `tsc --noEmit` o `npm run lint` fallan, el cambio NO está listo. Corregir errores antes de continuar.

### 4.5 Compilación — Siempre verificar ambos lados

> **Toda IA DEBE compilar frontend y backend después de cambios significativos.** No entregar sin verificar.

```bash
# Backend — compilar sin publicar (desde raíz del proyecto)
dotnet build NovaApi/NovaApi.csproj --no-restore

# Frontend — verificación de tipos
npx tsc --noEmit
```

Si `dotnet build` falla, el cambio NO está listo. Corregir errores de compilación antes de continuar.

### 4.6 Cambios de Base de Datos — Migraciones y Stored Procedures

> **REGLA**: Nunca meter Stored Procedures dentro de migraciones EF. Los SPs van en archivos `.sql` separados en la carpeta `SP/`.

- **Migraciones EF**: Solo para estructura de tablas (`dotnet ef migrations add ...`).
- **SPs**: Archivos `.sql` en `SP/[Modulo]/[Tabla].sql`. El usuario los ejecuta manualmente o autoriza al agente para ejecutarlos leyendo `/.env`.
- **Prohibido** `CREATE PROCEDURE` o `ALTER PROCEDURE` dentro de migraciones EF.

### 4.4 Fechas — Luxon Obligatorio (Prohibido Date nativo)

> **Prohibido** usar `new Date()`, `Date.now()`, o cualquier API del objeto `Date` nativo. Usar exclusivamente `DateTime` de luxon.

```typescript
import { DateTime } from 'luxon';

const hoy = DateTime.now(); // ahora
const desdeISO = DateTime.fromISO('2026-06-27T00:00:00'); // desde string
const personalizado = DateTime.local(2026, 6, 27); // desde componentes

hoy.toFormat('dd/MM/yyyy'); // 27/06/2026
hoy.toFormat('HH:mm'); // 15:30
hoy.plus({ days: 1 }); // mañana
hoy.diff(desdeISO, 'days').days; // diferencia en días
```
