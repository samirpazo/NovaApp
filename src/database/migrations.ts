import {
  addColumns,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
