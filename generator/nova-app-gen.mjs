import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => {
  const [key, ...value] = arg.slice(2).split('=');
  return [key, value.length ? value.join('=') : 'true'];
}));

const required = ['module', 'feature', 'entity', 'model', 'resource', 'pk'];
const missing = required.filter((key) => !args[key]);
if (args.help === 'true' || missing.length) {
  console.log(`
Nova App NCrud generator

Uso:
  npm run generate:crud -- \\
    --module=general --feature=periods --entity=GenPeriod \\
    --model=GenPeriodModel --resource=GenPeriod --pk=PerID \\
    --search=PerCode,PerName --sort=PerID,PerCode,PerName \\
    --access=ReadWrite [--force] [--dry-run]

El modelo y recurso deben existir antes de ejecutar el generador.
Faltantes: ${missing.join(', ') || 'ninguno'}
`);
  process.exit(args.help === 'true' ? 0 : 1);
}

for (const key of ['module', 'feature', 'entity', 'model', 'resource', 'pk']) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(args[key])) throw new Error(`--${key} debe ser un identificador válido.`);
}

const access = args.access ?? 'ReadWrite';
if (!['ReadWrite', 'ReadOnly'].includes(access)) throw new Error('--access debe ser ReadWrite o ReadOnly.');

const modelFile = path.join(root, 'src/database/models', `${args.entity}.ts`);
if (!fs.existsSync(modelFile)) throw new Error(`No existe el modelo: ${modelFile}`);
const modelSource = fs.readFileSync(modelFile, 'utf8');
const fields = [...modelSource.matchAll(/@(field|text)\('([^']+)'\)\s+(\w+):\s+([^;]+);/g)].map((match) => ({
  column: match[2], name: match[3], type: match[4].trim(),
}));
if (!fields.some((field) => field.name === args.pk)) throw new Error(`El PK ${args.pk} no existe en ${args.model}.`);

const list = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const searchable = list(args.search);
const sortable = list(args.sort || args.pk);
for (const field of [...searchable, ...sortable]) {
  if (!fields.some((candidate) => candidate.name === field)) throw new Error(`Campo desconocido: ${field}.`);
}

const target = path.join(root, 'src/features', args.module, args.feature);
const q = (value) => `'${value}'`;
const typeFields = fields.map((field) => `  ${field.name}: ${field.type};`).join('\n');
const mapFields = fields.map((field) => `  ${field.name}: model.${field.name},`).join('\n');
const sortableFields = sortable.map((field) => `    ${field}: ${q(fields.find((item) => item.name === field).column)},`).join('\n');
const observedFields = fields.map((field) => q(field.column)).concat(q('SecStatus')).join(', ');
const inputFields = fields.filter((field) => field.name !== args.pk);
const applyFields = inputFields.map((field) => `      record.${field.name} = input.${field.name};`).join('\n');

const files = {
  'types.ts': `import type { SyncStatus } from '@nozbe/watermelondb/Model';

export interface ${args.entity}ListItem {
  id: string;
  syncStatus: SyncStatus;
${typeFields}
}

${access === 'ReadWrite' ? `export interface Save${args.entity}Input {
  LocalId?: string;
  UserId: number;
${inputFields.map((field) => `  ${field.name}: ${field.type};`).join('\n')}
}
` : ''}`,
  'queries.ts': `import { Q } from '@nozbe/watermelondb';

import { createLocalCrudDataSource } from '@/components/crud';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, ${args.model} } from '@/database';
import type { ${args.entity}ListItem } from './types';

const toListItem = (model: ${args.model}): ${args.entity}ListItem => ({
  id: model.id,
  syncStatus: model.syncStatus,
${mapFields}
});

export const ${args.feature}DataSource = createLocalCrudDataSource({
  collection: database.get<${args.model}>(SYNC_RESOURCES.${args.resource}),
  map: toListItem,
  activeColumn: 'SecStatus',
  searchableColumns: [${searchable.map(q).join(', ')}],
  sortableColumns: {
${sortableFields}
  },
  observedColumns: [${observedFields}],
  defaultOrder: { column: ${q(fields.find((field) => field.name === args.pk).column)}, direction: 'desc' },
});

${access === 'ReadWrite' ? `export const ${args.feature}Queries = {
  find(LocalId: string) {
    return database.get<${args.model}>(SYNC_RESOURCES.${args.resource}).find(LocalId);
  },
  async nextTemporaryId(): Promise<number> {
    const records = await database.get<${args.model}>(SYNC_RESOURCES.${args.resource})
      .query(Q.where(${q(fields.find((field) => field.name === args.pk).column)}, Q.lt(0))).fetch();
    return Math.min(0, ...records.map((record) => record.${args.pk})) - 1;
  },
};
` : ''}`,
  'service.ts': access === 'ReadOnly'
    ? `export const ${args.feature}Service = { readOnly: true as const };\n`
    : `import { randomUUID } from 'expo-crypto';

import { SYNC_RESOURCES } from '@/contracts/sync';
import { database, ${args.model} } from '@/database';
import { ${args.feature}Queries } from './queries';
import type { Save${args.entity}Input } from './types';

const apply = (record: ${args.model}, input: Save${args.entity}Input) => {
${applyFields}
};

export const ${args.feature}Service = {
  async save(input: Save${args.entity}Input): Promise<void> {
    // Agregar aquí validaciones funcionales específicas del recurso.
    if (input.LocalId) {
      const model = await ${args.feature}Queries.find(input.LocalId);
      await database.write(() => model.update((record) => {
        apply(record, input);
        record.UpdateUserId = input.UserId;
        record.UpdateDate = new Date().toISOString();
      }));
      return;
    }
    const temporaryId = await ${args.feature}Queries.nextTemporaryId();
    const syncId = randomUUID();
    const now = new Date().toISOString();
    await database.write(() => database.get<${args.model}>(SYNC_RESOURCES.${args.resource}).create((record) => {
      record._raw.id = syncId;
      record.SyncId = syncId;
      record.SyncVersion = '';
      record.SecStatus = true;
      record.CreateUserId = input.UserId;
      record.UpdateUserId = input.UserId;
      record.DeleteUserId = null;
      record.CreateDate = now;
      record.UpdateDate = now;
      record.DeleteDate = null;
      record.${args.pk} = temporaryId;
      apply(record, input);
    }));
  },
  async remove(LocalId: string): Promise<void> {
    const model = await ${args.feature}Queries.find(LocalId);
    await database.write(() => model.markAsDeleted());
  },
};
`,
  'index.ts': `export * from './queries';\nexport * from './service';\nexport * from './types';\n`,
};

for (const [name, content] of Object.entries(files)) {
  const output = path.join(target, name);
  if (args['dry-run'] === 'true') {
    console.log(`[dry-run] ${path.relative(root, output)}`);
    continue;
  }
  if (fs.existsSync(output) && args.force !== 'true') {
    console.log(`[omitido] ${path.relative(root, output)} (use --force)`);
    continue;
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, content);
  console.log(`[generado] ${path.relative(root, output)}`);
}
