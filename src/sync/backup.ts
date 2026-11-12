import fetchLocalChanges from '@nozbe/watermelondb/sync/impl/fetchLocal';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { getActiveDatabase } from '@/database';

export interface BackupChange {
  Resource: string;
  SyncId: string;
  Operation: 'C' | 'U' | 'D';
  Data: Record<string, unknown> | null;
}

export interface LocalBackup {
  Version: 1;
  GeneratedAt: string;
  Resources: string[];
  Changes: BackupChange[];
}

/**
 * Serializa los cambios locales que todavía no llegaron al servidor.
 *
 * En nativo el almacenamiento local es durable, pero en web la base vive en
 * IndexedDB y el navegador puede desalojarla. Este respaldo permite recuperar
 * la evidencia capturada en campo aunque se pierda el almacenamiento del
 * navegador.
 */
export async function buildLocalBackup(): Promise<LocalBackup> {
  const database = getActiveDatabase();
  const localChanges = await fetchLocalChanges(database);
  const changes: BackupChange[] = [];

  for (const [table, changeSet] of Object.entries(localChanges.changes)) {
    const typed = changeSet as SyncTableChangeSet;
    const resource = table as unknown as string;

    for (const record of typed.created) {
      changes.push({
        Resource: resource,
        SyncId: record.SyncId,
        Operation: 'C',
        Data: sanitize(record),
      });
    }
    for (const record of typed.updated) {
      changes.push({
        Resource: resource,
        SyncId: record.SyncId,
        Operation: 'U',
        Data: sanitize(record),
      });
    }
    for (const record of typed.deleted) {
      changes.push({
        Resource: resource,
        SyncId: record.SyncId,
        Operation: 'D',
        Data: null,
      });
    }
  }

  return {
    Version: 1,
    GeneratedAt: new Date().toISOString(),
    Resources: Object.values(SYNC_RESOURCES),
    Changes: changes,
  };
}

function sanitize(record: Record<string, unknown>): Record<string, unknown> {
  const { _raw, _status, _changed, ...rest } = record;
  void _raw;
  void _status;
  void _changed;
  return rest;
}

function backupFileName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `nova-respaldo-${stamp}.json`;
}

/**
 * Genera el respaldo y lo entrega al usuario. En web se descarga; en nativo se
 * comparte a través de la hoja de compartir del sistema.
 */
export async function exportLocalBackup(): Promise<string> {
  const backup = await buildLocalBackup();
  const content = JSON.stringify(backup, null, 2);
  const name = backupFileName();

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return name;
  }

  const directory = new Directory(Paths.cache, 'nova-app', 'backups');
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, name);
  file.create({ intermediates: true, overwrite: true });
  file.write(content);

  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Respaldo de datos locales',
    });

  return name;
}
