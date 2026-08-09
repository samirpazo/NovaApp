import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Version 1 is the first local schema. Add a migration here before increasing schema.version.
export const databaseMigrations = schemaMigrations({ migrations: [] });
