# Generador NCrud de Nova App

Este generador crea la capa offline-first de un recurso cuyo contrato, tabla y modelo WatermelonDB
ya existen. No modifica schemas ni sincronización automáticamente porque esas decisiones requieren
revisar alcance, relaciones y acceso `ReadOnly`/`ReadWrite`.

```bash
npm run generate:crud -- \
  --module=general \
  --feature=periods \
  --entity=GenPeriod \
  --model=GenPeriodModel \
  --resource=GenPeriod \
  --pk=PerID \
  --search=PerCode,PerName \
  --sort=PerID,PerCode,PerName \
  --access=ReadWrite \
  --dry-run
```

El generador inspecciona los decoradores `@field` y `@text` del modelo para producir:

- `types.ts`;
- `queries.ts` con datasource paginado;
- `service.ts` de lectura/escritura o solo lectura; las altas y bajas incluyen auditoría local;
- `index.ts`.

Después de generar se deben añadir las validaciones funcionales del recurso y construir su pantalla.
La pantalla debe entregar `dataSource` a `NCrud`; no debe observar toda la colección y pasar `rows`.
No usar `--force` sobre archivos personalizados sin revisar primero el diff.
