import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';
import { entityBaseColumns } from '@/database/schema-base-columns';
import { technicalVisitCatalogColumns } from '@/database/technical-visit-catalog-columns';
import { SYNC_RESOURCES } from '@/contracts/sync';

export const databaseMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'GenDefinitionDetail',
          columns: [
            { name: 'DedImageFilID', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
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
        createTable({
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
      ],
    },
    {
      toVersion: 4,
      steps: Object.entries(technicalVisitCatalogColumns).map(([name, columns]) =>
        createTable({ name, columns }),
      ),
    },
  ],
});
