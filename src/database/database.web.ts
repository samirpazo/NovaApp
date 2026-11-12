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

    // El navegador puede desalojar IndexedDB cuando el dispositivo se queda
    // sin espacio. Pedir almacenamiento persistente reduce ese riesgo; no lo
    // elimina, por eso la versión web no garantiza la misma durabilidad que
    // la app nativa.
    void requestPersistentStorage();

    return new Database({ adapter, modelClasses: databaseModels });
}

async function requestPersistentStorage(): Promise<void> {
    try {
        if (typeof navigator === 'undefined') return;
        if (!navigator.storage?.persist) return;
        if (await navigator.storage.persisted()) return;
        await navigator.storage.persist();
    } catch {
        // La persistencia es una mejora opcional, nunca un requisito.
    }
}
