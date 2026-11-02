const legacyResources: Record<string, string> = {
  OagPlague: 'OagObjective',
  OagPlagueCultive: 'OagObjectiveCultive',
};

const legacyFields: Record<string, string> = {
  PlgID: 'ObjID',
  PlgDescription: 'ObjDescription',
  TypePlague: 'ObjType',
  PgcID: 'OjcID',
};

export function normalizeObjectiveContract(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeObjectiveContract);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      let normalizedChild = child;
      if (key === 'Resource' && typeof child === 'string') {
        normalizedChild = legacyResources[child] ?? child;
      } else if (key === 'Snapshot' && typeof child === 'string') {
        try {
          normalizedChild = JSON.stringify(normalizeObjectiveContract(JSON.parse(child)));
        } catch {
          normalizedChild = child;
        }
      } else {
        normalizedChild = normalizeObjectiveContract(child);
      }

      return [
        legacyFields[key] ?? key,
        normalizedChild,
      ];
    }),
  );
}
