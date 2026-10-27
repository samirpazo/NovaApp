import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { databaseMigrations } from '@/database/migrations';
import { databaseModels } from '@/database/models';
import { databaseSchema } from '@/database/schema';

export function createDatabase(dbName: string): Database {
  const adapter = new SQLiteAdapter({
    dbName,
    schema: databaseSchema,
    migrations: databaseMigrations,
    jsi: true,
    onSetUpError: (error) =>
      console.error('No se pudo inicializar WatermelonDB.', error),
  });

  return new Database({ adapter, modelClasses: databaseModels });
}
