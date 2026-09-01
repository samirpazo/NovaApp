import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { databaseMigrations } from '@/database/migrations';
import { databaseModels } from '@/database/models';
import { databaseSchema } from '@/database/schema';

const adapter = new SQLiteAdapter({
  dbName: 'nova-app',
  schema: databaseSchema,
  migrations: databaseMigrations,
  jsi: true,
  onSetUpError: (error) =>
    console.error('No se pudo inicializar WatermelonDB.', error),
});

export const database = new Database({ adapter, modelClasses: databaseModels });
