import { localStorageKey, type Database } from '@nozbe/watermelondb';
import * as Crypto from 'expo-crypto';

import type { SyncConnection } from '@/sync/config';
import { createDatabase } from '@/database/database';

export interface DatabaseIdentity {
  BaseUrl: string;
  UsrID: number;
  PrsID: number;
}

const LEGACY_SCOPE_KEY = localStorageKey<string>('nova.sync.activeScope');
const LEGACY_USER_KEY = localStorageKey<number>('nova.sync.activeScopeUser');
const LEGACY_OWNER_KEY = localStorageKey<string>('nova.storage.owner');
const LEGACY_CONFLICTS_KEY = localStorageKey<unknown>('nova.sync.conflicts');
const UNASSIGNED_CONFLICTS_KEY = localStorageKey<unknown>(
  'nova.sync.conflicts.unassignedLegacy',
);
const databases = new Map<string, Database>();
let legacyDatabase: Database | undefined;
let activeDatabase: Database | undefined;
let activeIdentityKey: string | null = null;
let activationQueue = Promise.resolve();

export function canonicalDatabaseIdentity(identity: DatabaseIdentity): string {
  const url = new URL(identity.BaseUrl);
  const baseUrl = `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`;
  return `${baseUrl}|${identity.PrsID}|${identity.UsrID}`;
}

export async function databaseIdentityKey(
  identity: DatabaseIdentity,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalDatabaseIdentity(identity),
  );
}

function expectedLegacyScope(
  connection: SyncConnection,
  identity: DatabaseIdentity,
): string {
  return `${connection.BaseUrl.replace(/\/+$/, '').toLowerCase()}|${connection.BranchId ?? 'general'}|${identity.PrsID}|${identity.UsrID}`;
}

async function getLegacyDatabase(): Promise<Database> {
  legacyDatabase ??= createDatabase('nova-app');
  return legacyDatabase!;
}

async function findOwnedLegacyDatabase(
  connection: SyncConnection,
  identity: DatabaseIdentity,
  identityKey: string,
): Promise<Database | null> {
  const legacy = await getLegacyDatabase();
  const owner = await legacy.localStorage.get(LEGACY_OWNER_KEY);
  if (owner) {
    if (owner === identityKey) return legacy;
    await quarantineLegacyConflicts(legacy);
    return null;
  }

  const [scope, userId] = await Promise.all([
    legacy.localStorage.get(LEGACY_SCOPE_KEY),
    legacy.localStorage.get(LEGACY_USER_KEY),
  ]);
  if (
    scope !== expectedLegacyScope(connection, identity) ||
    userId !== identity.UsrID
  ) {
    await quarantineLegacyConflicts(legacy);
    return null;
  }

  await legacy.localStorage.set(LEGACY_OWNER_KEY, identityKey);
  return legacy;
}

async function quarantineLegacyConflicts(database: Database): Promise<void> {
  const conflicts = await database.localStorage.get(LEGACY_CONFLICTS_KEY);
  if (conflicts == null) return;
  const existing = await database.localStorage.get(UNASSIGNED_CONFLICTS_KEY);
  const quarantined = Array.isArray(conflicts) && Array.isArray(existing)
    ? [...new Map([...existing, ...conflicts].map((item) => [JSON.stringify(item), item])).values()]
    : existing == null
      ? conflicts
      : { existing, additional: conflicts };
  await database.localStorage.set(UNASSIGNED_CONFLICTS_KEY, quarantined);
  await database.localStorage.remove(LEGACY_CONFLICTS_KEY);
}

export function activateAccountDatabase(
  connection: SyncConnection,
  identity: DatabaseIdentity,
  isCurrent: () => boolean = () => true,
): Promise<{ database: Database; identityKey: string }> {
  const activate = async () => {
    const identityKey = await databaseIdentityKey(identity);
    if (!isCurrent()) throw new Error('La sesión cambió al activar su almacenamiento.');
    let accountDatabase = databases.get(identityKey);
    if (!accountDatabase) {
      accountDatabase =
        (await findOwnedLegacyDatabase(connection, identity, identityKey)) ??
        createDatabase(`nova-app-${identityKey}`);
      databases.set(identityKey, accountDatabase);
    }
    if (!isCurrent()) throw new Error('La sesión cambió al activar su almacenamiento.');
    activeDatabase = accountDatabase;
    activeIdentityKey = identityKey;
    return { database: accountDatabase, identityKey };
  };

  const result = activationQueue.then(activate);
  activationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function deactivateAccountDatabase(): void {
  activeDatabase = undefined;
  activeIdentityKey = null;
}

export function getActiveDatabase(): Database {
  if (!activeDatabase)
    throw new Error('El almacenamiento local de la cuenta aún no está activo.');
  return activeDatabase;
}

export function getActiveIdentityKey(): string | null {
  return activeIdentityKey;
}

export function isActiveIdentity(identityKey: string): boolean {
  return activeIdentityKey === identityKey;
}
