const INT32_MIN = -2_147_483_648;
const INT32_MAX = 2_147_483_647;
let lastTimestamp = 0;
let idsAtTimestamp = 0;

export function createTechnicalVisitTemporaryId(): number {
  const timestamp = Date.now() % INT32_MAX || 1;
  idsAtTimestamp = timestamp === lastTimestamp ? idsAtTimestamp + 1 : 0;
  lastTimestamp = timestamp;
  return -(((timestamp + idsAtTimestamp - 1) % INT32_MAX) + 1);
}

export function normalizeTechnicalVisitTemporaryIds(
  value: unknown,
  ids = new Map<number, number>(),
): boolean {
  if (Array.isArray(value))
    return value.reduce(
      (changed, item) => normalizeTechnicalVisitTemporaryIds(item, ids) || changed,
      false,
    );
  if (!value || typeof value !== 'object') return false;

  let changed = false;
  for (const [key, current] of Object.entries(value)) {
    if (
      key.endsWith('ID') &&
      typeof current === 'number' &&
      (current < INT32_MIN || current > INT32_MAX)
    ) {
      let safeId = ids.get(current);
      if (safeId === undefined) {
        safeId = -(ids.size + 1);
        ids.set(current, safeId);
      }
      (value as Record<string, unknown>)[key] = safeId;
      changed = true;
    } else if (normalizeTechnicalVisitTemporaryIds(current, ids)) {
      changed = true;
    }
  }
  return changed;
}
