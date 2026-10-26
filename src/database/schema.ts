import { appSchema, tableSchema } from '@nozbe/watermelondb';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { entityBaseColumns } from '@/database/schema-base-columns';
import { technicalVisitCatalogColumns } from '@/database/technical-visit-catalog-columns';

export { entityBaseColumns } from '@/database/schema-base-columns';

export const databaseSchema = appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: SYNC_RESOURCES.GenDefinition,
      columns: [
        ...entityBaseColumns,
        { name: 'DefID', type: 'number', isIndexed: true },
        { name: 'DefDescription', type: 'string' },
        { name: 'DefCode', type: 'string' },
        { name: 'DefStated', type: 'number' },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.GenDefinitionDetail,
      columns: [
        ...entityBaseColumns,
        { name: 'DedID', type: 'number', isIndexed: true },
        { name: 'DedCode', type: 'string', isOptional: true },
        { name: 'DedDescription', type: 'string' },
        { name: 'DedValue', type: 'number' },
        { name: 'DedAbbreviation', type: 'string', isOptional: true },
        { name: 'DedFormat', type: 'string', isOptional: true },
        { name: 'DedHelper', type: 'string', isOptional: true },
        { name: 'DedHelper2', type: 'string', isOptional: true },
        { name: 'DedIcon', type: 'string', isOptional: true },
        { name: 'DedColor', type: 'string', isOptional: true },
        { name: 'DedStated', type: 'number' },
        { name: 'DefID', type: 'number', isIndexed: true },
        { name: 'DedGroup', type: 'string', isOptional: true },
        { name: 'DedImagePath', type: 'string', isOptional: true },
        { name: 'DedImageFilID', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.RstBranch,
      columns: [
        ...entityBaseColumns,
        { name: 'BrhID', type: 'number', isIndexed: true },
        { name: 'BrhResID', type: 'number' },
        { name: 'BrhName', type: 'string' },
        { name: 'BrhAddress', type: 'string', isOptional: true },
        { name: 'BrhPhone', type: 'string', isOptional: true },
        { name: 'BrhEmail', type: 'string', isOptional: true },
        { name: 'BrhManagerName', type: 'string', isOptional: true },
        { name: 'BrhCurrencyDefID', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.RstTable,
      columns: [
        ...entityBaseColumns,
        { name: 'TabID', type: 'number', isIndexed: true },
        { name: 'TabTableNumber', type: 'number' },
        { name: 'TabCapacity', type: 'number' },
        { name: 'TabStatus', type: 'number' },
        { name: 'BrhID', type: 'number', isOptional: true, isIndexed: true },
        { name: 'TabPosX', type: 'number' },
        { name: 'TabPosY', type: 'number' },
        { name: 'TabWidth', type: 'number' },
        { name: 'TabHeight', type: 'number' },
        { name: 'TabRotation', type: 'number' },
        { name: 'TabShape', type: 'string' },
        { name: 'TabZIndex', type: 'number' },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.OagTechnicalVisitSchedule,
      columns: [
        ...entityBaseColumns,
        { name: 'TvsID', type: 'number', isIndexed: true },
        { name: 'PlfID', type: 'number', isIndexed: true },
        { name: 'CmpID', type: 'number', isOptional: true },
        { name: 'TvsScheduledDate', type: 'string' },
        { name: 'TvsResponsiblePrsID', type: 'number', isIndexed: true },
        { name: 'TvsVisitType', type: 'number' },
        { name: 'TvsObservation', type: 'string', isOptional: true },
        { name: 'PlfName', type: 'string', isOptional: true },
        { name: 'FrfName', type: 'string', isOptional: true },
        { name: 'CmpName', type: 'string', isOptional: true },
        { name: 'ProducerName', type: 'string', isOptional: true },
        { name: 'ResponsibleName', type: 'string', isOptional: true },
        { name: 'VrtDescription', type: 'string', isOptional: true },
        { name: 'CltDescription', type: 'string', isOptional: true },
        { name: 'TypeCropDescription', type: 'string', isOptional: true },
        { name: 'FrfAddress', type: 'string', isOptional: true },
        { name: 'ZonDescription', type: 'string', isOptional: true },
        { name: 'SzoDescription', type: 'string', isOptional: true },
        { name: 'TviID', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: SYNC_RESOURCES.OagTechnicalVisit,
      columns: [
        ...entityBaseColumns,
        { name: 'TviID', type: 'number', isIndexed: true },
        { name: 'TvsID', type: 'number', isIndexed: true },
        { name: 'TviPerformedDate', type: 'string' },
        { name: 'TviDocumentSeries', type: 'string', isOptional: true },
        { name: 'TviDocumentNumber', type: 'number', isOptional: true },
        { name: 'TviLatitude', type: 'number', isOptional: true },
        { name: 'TviLongitude', type: 'number', isOptional: true },
        { name: 'TviObservation', type: 'string', isOptional: true },
        { name: 'TviSignatureFilID', type: 'number', isOptional: true },
        { name: 'Snapshot', type: 'string' },
      ],
    }),
    ...Object.entries(technicalVisitCatalogColumns).map(([name, columns]) =>
      tableSchema({ name, columns }),
    ),
  ],
});
