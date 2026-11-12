import fetchLocalChanges from '@nozbe/watermelondb/sync/impl/fetchLocal';
import type { SyncDatabaseChangeSet, SyncTableChangeSet } from '@nozbe/watermelondb/sync';

import {
  SYNC_RESOURCES,
  type SyncResource,
} from '@/contracts/sync';
import { getActiveDatabase, type EntityBaseModel } from '@/database';

/**
 * Catálogos que el móvil escribía antes de convertir las definiciones en
 * solo lectura. Solo estas tablas pueden arrastrar restos locales heredados;
 * el resto de catálogos de solo lectura nunca se escribieron en el móvil.
 */
const REPAIRABLE_READ_ONLY_RESOURCES: SyncResource[] = [
  SYNC_RESOURCES.GenDefinition,
  SYNC_RESOURCES.GenDefinitionDetail,
];

export interface ReadOnlyDrift {
  /** Recursos de solo lectura con restos locales pendientes. */
  resources: SyncResource[];
  /** Filas que el móvil creó y el servidor nunca aceptó. */
  created: { resource: SyncResource; id: string }[];
  /** Filas que el móvil editó y el servidor debe reponer. */
  updated: { resource: SyncResource; id: string }[];
  /** Filas que el móvil borró y el servidor debe reponer. */
  deleted: { resource: SyncResource; id: string }[];
}

export function hasReadOnlyDrift(drift: ReadOnlyDrift): boolean {
  return drift.resources.length > 0;
}

/**
 * Detecta restos locales sobre recursos de solo lectura.
 *
 * El servidor gobierna estas tablas. Una instalación heredada puede arrastrar
 * ediciones de una versión anterior y esos restos no deben bloquear el Push de
 * las visitas técnicas.
 */
export async function detectReadOnlyDrift(
  database = getActiveDatabase(),
): Promise<ReadOnlyDrift> {
  const drift: ReadOnlyDrift = {
    resources: [],
    created: [],
    updated: [],
    deleted: [],
  };
  const localChanges = await fetchLocalChanges(database);
  const changes = localChanges.changes as Partial<
    Record<SyncResource, SyncTableChangeSet>
  >;
  for (const resource of REPAIRABLE_READ_ONLY_RESOURCES) {
    const table = changes[resource];
    if (!table) continue;
    const created = table.created
      .filter((raw) => raw._status === 'created')
      .map((raw) => ({ resource, id: raw.id }));
    const updated = table.updated
      .filter((raw) => raw._status === 'updated')
      .map((raw) => ({ resource, id: raw.id }));
    const deleted = table.deleted.map((id) => ({ resource, id }));
    if (!created.length && !updated.length && !deleted.length) continue;
    drift.resources.push(resource);
    drift.created.push(...created);
    drift.updated.push(...updated);
    drift.deleted.push(...deleted);
  }
  return drift;
}

/**
 * Elimina las filas de solo lectura que el Pull no repuso.
 *
 * Tras reponer el catálogo oficial, lo que sigue pendiente son filas que el
 * servidor no devolvió: no pertenecen al catálogo y deben desaparecer en lugar
 * de quedar pendientes para siempre.
 */
export async function discardReadOnlyLeftovers(
  changes: SyncDatabaseChangeSet,
  database = getActiveDatabase(),
): Promise<void> {
  const leftovers: { resource: SyncResource; id: string }[] = [];
  const tables = changes as Partial<
    Record<SyncResource, SyncTableChangeSet>
  >;
  for (const resource of REPAIRABLE_READ_ONLY_RESOURCES) {
    const table = tables[resource];
    if (!table) continue;
    for (const raw of [...table.created, ...table.updated]) {
      leftovers.push({ resource, id: raw.id });
    }
  }
  if (!leftovers.length) return;
  await database.write(async () => {
    const records: EntityBaseModel[] = [];
    for (const row of leftovers) {
      try {
        records.push(
          await database.get<EntityBaseModel>(row.resource).find(row.id),
        );
      } catch {
        // La fila ya no existe: no hay nada que eliminar.
      }
    }
    if (records.length) {
      await database.batch(
        records.map((record) => record.prepareDestroyPermanently()),
      );
    }
  }, 'discard read-only leftovers');
}

/**
 * Descarta los restos locales de un catálogo de solo lectura:
 *
 * - Las filas que el móvil creó se eliminan: el servidor nunca las aceptó y no
 *   pertenecen al catálogo oficial, así que contaminarían los selectores.
 * - Los borrados locales se retiran para que la versión del servidor reponga
 *   la fila cuando el catálogo se vuelve a descargar.
 *
 * Las ediciones locales las corrige el Pull posterior: el resolvedor de
 * conflictos da prioridad al servidor en estos recursos.
 */
export async function discardReadOnlyDrift(
  drift: ReadOnlyDrift,
  database = getActiveDatabase(),
): Promise<void> {
  if (!drift.created.length && !drift.deleted.length) return;
  await database.write(async () => {
    if (drift.created.length) {
      const records: EntityBaseModel[] = [];
      for (const row of drift.created) {
        try {
          records.push(
            await database.get<EntityBaseModel>(row.resource).find(row.id),
          );
        } catch {
          // La fila ya no existe: no hay nada que eliminar.
        }
      }
      if (records.length) {
        await database.batch(
          records.map((record) => record.prepareDestroyPermanently()),
        );
      }
    }
    const byResource = new Map<SyncResource, string[]>();
    for (const row of drift.deleted) {
      const ids = byResource.get(row.resource) ?? [];
      ids.push(row.id);
      byResource.set(row.resource, ids);
    }
    await Promise.all(
      [...byResource.entries()].map(([resource, ids]) =>
        database.adapter.destroyDeletedRecords(resource, ids),
      ),
    );
  }, 'discard read-only local drift');
}
