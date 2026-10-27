import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { databaseMigrations } from '@/database/migrations';
import { databaseModels } from '@/database/models';
import { databaseSchema } from '@/database/schema';

export function createDatabase(dbName: string): Database {
  const adapter = new LokiJSAdapter({
    dbName,
    schema: databaseSchema,
    migrations: databaseMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: (error) =>
      console.error('No se pudo inicializar WatermelonDB.', error),
  });

  return new Database({ adapter, modelClasses: databaseModels });
}
