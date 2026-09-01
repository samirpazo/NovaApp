# Nova N-Series Components (Skill)

Este documento sirve como guía para los Agentes de IA sobre cómo utilizar los componentes personalizados de la serie **N** de Nova. Estos componentes están optimizados para dashboards empresariales de alta densidad.

## Resumen de Componentes

### Inputs de Formulario

- **NText**: Input de texto con soporte para números, decimales, mayúsculas automáticas y botón de limpieza.
- **NDate**: Selector de fecha/hora integrado con Luxon. Soporta modos `date`, `datetime` y `time`.
- **NSelect**: Selector mejorado.
- **NSelectDefinition**: Selector que se conecta automáticamente a la tabla de definiciones del backend mediante un `defCode`.
- **NSelectPeriod**: Selector de periodos contables/operativos.
- **NSelectBoolean**: Control segmentado para Sí/No.
- **NMultiSelect**: Selección múltiple con tags dinámicos.
- **NTextarea**: Área de texto con diseño consistente.

### Selectores de Negocio (Específicos del Backend)

Estos selectores ya están conectados a sus respectivos servicios y endpoints del backend, simplificando la selección de entidades del sistema:

- **NSelectPerson**: Selector unificado de Personas (`GenPerson`) con soporte para retornar el ID o el objeto completo (`returnObject`).
- **NSelectPosition**: Selector para Puestos / Cargos (`GenPosition`).
- **NSelectCostCenter**: Selector para Centros de Costos (`GenCostCenter`).
- **NSelectBusinessLine**: Selector para Líneas de Negocio (`GenBusinessLine`).

### Visualización de Datos y Estados

- **NBadge**: Etiquetas de estado con indicadores LED y animación de pulso.
- **NMetricCard**: Tarjeta de KPI con títulos, valores y tendencias.
- **NStatCard**: Tarjeta métrica avanzada con Sparklines (mini-gráficos).
- **NDataChart**: Gráficos de Área o Barras simplificados.
- **NGauge**: Medidor radial para telemetría.
- **NStatusIndicator**: Punto de estado (online/offline) con animación ping.

### Utilidades y Multimedia

- **NFile**: Cargador de archivos con Drag & Drop.
- **NFileGallery**: Galería de evidencias para imágenes y documentos.
- **NImage**: Visualizador de imágenes con soporte para carga autenticada.
- **NQRCode**: Generador de códigos QR con acciones de descarga.
- **NBarcode**: Generador de códigos de barras profesional.
- **NCodeBlock**: Visualizador de código con resaltado sutil.
- **NAvatarGroup**: Grupo de avatares con expansión al hover.

### Estructura y Navegación

- **NGrid**: Sistema de grillas consistente para formularios.
- **NBentoGrid**: Layout asimétrico para dashboards modernos.
- **NTable**: Tabla genérica ("Dumb Component") basada en la visual de NCrud, que recibe items por prop y emite eventos en vez de conectarse a servicios. Ideal para detalles (maestro-detalle).
- **NSteps**: Rastreador de procesos por etapas.
- **NTimeline**: Línea de tiempo vertical de eventos.
- **NEmptyState**: Estado vacío con icono y acción.
- **NAlert**: Alertas técnicas con variantes cromáticas.

## Patrones de Uso Comunes

### Formularios en NCrud

Al usar el componente `NCrud`, se recomienda envolver los campos en un `NGrid`:

```tsx
<NGrid cols={2}>
  <NText
    label="Nombre"
    name="Name"
    required
    icon={User}
  />
  <NSelectDefinition
    label="Categoría"
    name="Category"
    defCode="CAT_PROD"
  />
  <NDate
    label="Fecha"
    name="Date"
    mode="date"
  />
  <NSwitch
    label="Activo"
    name="Status"
  />
</NGrid>
```

### Indicadores de Dashboard

Para la sección superior de un dashboard:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <NMetricCard
    title="Ventas Totales"
    value="$12,400"
    trend={{ value: 12, isUp: true }}
    icon={DollarSign}
  />
  <NStatCard
    title="Usuarios"
    value="1,204"
    chartData={data}
    variant="success"
  />
</div>
```

## Referencia Técnica Completa

Para una lista detallada de todas las Props, consulte: `src/components/custom/README.md`.
