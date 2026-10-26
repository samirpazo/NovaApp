# Visitas técnicas offline: inventario y fases

Este documento registra la brecha entre el flujo de visitas técnicas de Nova Web y los datos que
Nova App puede consultar sin conexión. La evidencia se contrastó con los contratos de sync de la app,
`SyncController`, `OagTechnicalVisitSaveCe`, la pantalla móvil y la página/componentes web de visitas.

## Estado actual

Nova App ya sincroniza los recursos de visita y los catálogos indicados en la fase 2. Las
definiciones y sus detalles estaban en WatermelonDB. `RstBranch` y `RstTable` no participan en
visitas técnicas.

`OagTechnicalVisit` sincroniza un snapshot agregado. El backend guarda estas tablas de visita:

| Tabla | Sección |
|---|---|
| `OagTechnicalVisit` | Encabezado, coordenadas, observación y firma |
| `OagTechnicalVisitSchedule` | Programación, lote, campaña, fecha y supervisor |
| `OagTechnicalVisitApplication` | Aplicaciones |
| `TadTechnicalVisitApplicationDetail` | Productos, dosis y cantidades aplicadas |
| `OagTechnicalVisitDiagnosis` | Evaluación fitosanitaria |
| `OagTechnicalVisitPhenology` | Estado fenológico |
| `OagTechnicalVisitActivity` | Actividades/labores realizadas |
| `OagTechnicalVisitInstallation` | Instalaciones revisadas |
| `OagTechnicalVisitRecommendation` | Recomendaciones |
| `OagTechnicalVisitRecommendationFollowUp` | Seguimiento de recomendaciones |
| `OagTechnicalVisitCulturalActivity` | Actividades culturales sugeridas/realizadas |
| `OagTechnicalVisitCulturalActivityFollowUp` | Seguimiento cultural |
| `OagTechnicalVisitEvidence` | Evidencias adjuntas |

“Recomendaciones anteriores” y “Actividades culturales anteriores” son vistas de filas de la misma
visita/relación; no son tablas adicionales.

El Push ya acepta crear una programación, y limita `TvsResponsiblePrsID` al supervisor autenticado.
La app no permite crearla porque aún no sincroniza los catálogos que necesita el formulario web.
Para crear una programación la web selecciona lote, campaña, fecha y supervisor; al elegir lote
resuelve además el supervisor asignado al fundo.

## Catálogos requeridos por el flujo

| Tabla/catálogo | Uso en web | Situación en Nova App |
|---|---|---|
| `OagPlotFarm` | Selector de lote; aporta fundo y cultivo para opciones dependientes | Sincronizado; filtrado por fundos asignados al supervisor |
| `GenCampaign` | Selector obligatorio de campaña en programación | Sincronizado como catálogo de solo lectura |
| `OagFruitFarmSupervisor` | Determina supervisor asignado al fundo seleccionado | Sincronizado solo para asignaciones vigentes del supervisor |
| `OagFruitFarm` | Nombre/dirección del fundo del lote | Sincronizado para fundos asignados |
| `OagCultive`, `OagVariety` | Etiquetas de cultivo y variedad del lote | Sincronizados para cultivos/variedades de lotes asignados |
| `OagFarmSupplies` | Catálogo de productos/insumos para aplicaciones y recomendaciones | Sincronizado según objetivos vinculados a cultivos asignados |
| `OagFarmSuppliesTarget` | Objetivos compatibles con el insumo y cultivo | Sincronizado solo para cultivos de lotes asignados |
| `OagPlague` | Opciones de plaga para diagnóstico y objetivos de insumos | Sincronizado según las relaciones de cultivos asignados |
| `OagPlagueCultive` | Filtra plagas por cultivo del lote | Sincronizado solo para cultivos de lotes asignados |
| `OagWaterSource` | Fuentes de agua del lote para actividades de riego | Sincronizado solo para lotes asignados |
| `GenDefinition` + `GenDefinitionDetail` | Tipos, unidades, etapas y estados usados en las secciones | Sí están sincronizadas |

Las definiciones consumidas por el flujo web incluyen `OAG_FIELD_APPLICATION_MODE`,
`OAG_APPLICATION_TYPE`, `OAG_APPLICATION_QUANTITY_UNIT`, `OAG_DOSE_UNIT`, `OAG_TYPE_UNIT`,
`OAG_FARM_SUPPLIES_STATUS`, `OAG_PHENOLOGICAL_STAGE`, `OAG_PLANT_ORGAN`,
`OAG_VISIT_CULTURAL_ACTIVITY`, `OAG_RECOMMENDATION_TYPE`,
`OAG_RECOMMENDATION_FOLLOW_UP_STATUS`, `OAG_INSTALLATION_TYPE`, `OAG_IRRIGATION_TYPE`,
`OAG_IRRIGATION_SYSTEM`, `OAG_FUEL_TYPE`, `OAG_WEEDING_TYPE`, `OAG_TRAP_TYPE`,
`OAG_WATER_VOLUME_UNIT`, `OAG_WATER_FLOW_UNIT` y `OAG_DURATION_UNIT`. El editor móvil también
declara `OAG_TECHNICAL_DIAGNOSIS_CATEGORY`.

El editor móvil ya resuelve definiciones localmente para varios campos, pero no expone todavía la
misma selección semántica para todos: por ejemplo, `TinInstallationType` aparece como número y no
como selector de `OAG_INSTALLATION_TYPE`.

No se encontró una dependencia directa de `GenParameter`/`ParCode` en el formulario web de visitas;
las listas desplegables revisadas usan `GenDefinitionDetail` o servicios de catálogos agrícolas.

## Archivos y datos binarios

La firma y las evidencias no son tablas de catálogo. Sus relaciones se incluyen en el agregado y los
archivos se conservan localmente hasta la carga mediante `GenFiles/upload` antes del Push. El flujo
offline existente de medios se mantiene como parte del contrato; no se deben duplicar imágenes
binarias como recursos de WatermelonDB.

## Diferencias visibles de interfaz

- La web permite agregar, editar y eliminar programaciones desde el toolbar NCrud y filtrar por
  fecha inicial, fecha final, supervisor y estado.
- En móvil, el filtro de supervisor no aporta en este momento: el Pull limita las programaciones al
  supervisor autenticado. Se mantienen fecha y estado.
- La búsqueda de texto de la lista web está deshabilitada; la app debe ocultarla también.
- El toolbar móvil debe conservar las acciones nativas de selección/sincronización, pero usar el
  mismo orden y permisos efectivos de Agregar, Editar y Eliminar cuando se completen las altas.
- La lista móvil debe migrar de `rows` cargadas a estado React a `NCrudDataSource`, como exige
  `AI-CONTEXT.md`, y mantener la búsqueda/filtros dentro de la consulta local.
- El detalle móvil todavía usa algunos campos numéricos para relaciones que la web presenta como
  selectores con etiqueta; esos campos necesitan los catálogos anteriores para una captura usable sin
  tener que conocer IDs.

## Plan por fases

1. **Inventario** (completado): confirmar tablas del agregado, catálogos, alcance y diferencias con
   Nova Web.
2. **Datos offline** (completado en código): sincronizar campañas; fundos, lotes y asignaciones;
   cultivos/variedades; insumos/objetivos; plagas y fuentes de agua. ReadOnly en Push; fundos/lotes/
   asignaciones/fuentes y relaciones de cultivo limitados por el supervisor autenticado. El esquema
   local sube a v4 y solicita un bootstrap por alcance. No se agrega `GenParameter` porque la web no
   lo consume para visitas.
3. **Programaciones NCrud**: migrar la lista a `NCrudDataSource`; replicar toolbar, filtros y
   formulario de programación con alta/edición/eliminación local, `NFormPanel`, permisos y validación
   de `PrsID`. No sincronizar desde cada acción; el guardado queda local y el Push central conserva
   los conflictos.
4. **Componentes de detalle**: reemplazar entradas de IDs por selectores offline para insumos,
   objetivos, plagas, fuentes de agua e instalaciones; completar definición/unidad/estado y mantener
   todos los cambios de secciones dentro del guardado único del agregado.
5. **Cierre funcional**: validar alta de programación, apertura/captura de visita, firma/evidencia,
   cierre y reapertura offline, Push idempotente, Pull/reconciliación y conflictos.

La siguiente fase debe comenzar por acordar los recursos de catálogo y su alcance; el backend ya
acepta `OagTechnicalVisitSchedule`, pero todavía no entrega a la app los datos necesarios para
construir selectores offline fiables.
