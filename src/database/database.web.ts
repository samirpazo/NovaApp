import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { databaseMigrations } from '@/database/migrations';
import { databaseModels } from '@/database/models';
import { databaseSchema } from '@/database/schema';

const adapter = new LokiJSAdapter({
  dbName: 'nova-app',
  schema: databaseSchema,
  migrations: databaseMigrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error) =>
    console.error('No se pudo inicializar WatermelonDB.', error),
});

export const database = new Database({ adapter, modelClasses: databaseModels });
