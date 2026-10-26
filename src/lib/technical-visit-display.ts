import { formatters } from '@/lib/formatter';

type DisplayField = {
  key: string;
  label: string;
  kind?: 'number' | 'decimal' | 'boolean' | 'datetime';
  definitionCode?: string;
};

type DefinitionOption = { label: string; value: number };

const extraLabels: Record<string, string> = {
  FrsDescription: 'Insumo',
  OwsName: 'Fuente de agua',
  TapApplicationModeDescription: 'Modo de aplicación',
  TadApplicationDate: 'Fecha de aplicación',
  TvrFollowUpLabel: 'Seguimiento',
  TrfStatusDescription: 'Estado del seguimiento',
  TcfStatusDescription: 'Estado del seguimiento',
  TviPerformedDate: 'Fecha de visita',
};

const isSystemField = (key: string) =>
  /^(Sync|SecStatus|Create|Update|Delete|Pending)/.test(key) ||
  key.endsWith('ID');

export function technicalVisitDisplayValues(
  row: Record<string, unknown>,
  fields: DisplayField[],
  options: Record<string, DefinitionOption[]>,
) {
  const values: { label: string; value: string }[] = [];
  const rendered = new Set<string>();
  const add = (
    key: string,
    label: string,
    value: unknown,
    kind?: DisplayField['kind'],
  ) => {
    if (value == null || value === '' || rendered.has(key)) return;
    let text: string;
    if (kind === 'boolean' || typeof value === 'boolean')
      text = value ? 'Sí' : 'No';
    else if (kind === 'datetime') text = formatters.datetime(String(value));
    else text = String(value);
    values.push({ label, value: text });
    rendered.add(key);
  };

  for (const field of fields) {
    const raw = row[field.key];
    const joined = row[`${field.key}Description`];
    if ((raw == null || raw === '') && (joined == null || joined === ''))
      continue;
    const option = field.definitionCode
      ? options[field.definitionCode]?.find(
          (item) => item.value === Number(raw),
        )
      : undefined;
    add(field.key, field.label, joined ?? option?.label ?? raw, field.kind);
  }

  for (const [key, value] of Object.entries(row)) {
    if (
      isSystemField(key) ||
      rendered.has(key) ||
      value == null ||
      value === ''
    )
      continue;
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    )
      continue;
    const descriptionBase = key.endsWith('Description')
      ? key.slice(0, -11)
      : null;
    if (descriptionBase && rendered.has(descriptionBase)) continue;
    const label =
      extraLabels[key] ??
      (descriptionBase
        ? (fields.find((field) => field.key === descriptionBase)?.label ??
          'Descripción')
        : key
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^[A-Z][a-z]{2}/, '')
            .trim());
    add(
      key,
      label || 'Detalle',
      value,
      key === 'TadApplicationDate' ? 'datetime' : undefined,
    );
  }

  return values;
}
