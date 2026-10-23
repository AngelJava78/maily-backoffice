import {
  CLINIC_MODULE_ORDER,
  MODULE_PREREQUISITE,
  type ClinicModuleKey,
} from '../schemas/clinicModuleCatalog';

// Built once: dependent(s) of each prerequisite, the reverse of MODULE_PREREQUISITE. Iterating
// CLINIC_MODULE_ORDER (instead of Object.entries) keeps every key typed as ClinicModuleKey, with
// no type assertion needed.
const DEPENDENTS_OF: Partial<Record<ClinicModuleKey, readonly ClinicModuleKey[]>> = (() => {
  const dependents: Partial<Record<ClinicModuleKey, ClinicModuleKey[]>> = {};
  for (const dependent of CLINIC_MODULE_ORDER) {
    const prerequisite = MODULE_PREREQUISITE[dependent];
    if (prerequisite === undefined) {
      continue;
    }
    const list = dependents[prerequisite] ?? [];
    list.push(dependent);
    dependents[prerequisite] = list;
  }
  return dependents;
})();

/**
 * The set of modules marked in the form after marking or unmarking `key` (research D4, FR-009).
 * Marking a module adds it and, in cascade, every module it requires; unmarking a module removes
 * it and, in cascade, every module that depended on it, directly or through another dependent. Pure:
 * it never mutates `selected` and always returns a new set.
 */
export function withModuleChecked(
  selected: ReadonlySet<ClinicModuleKey>,
  key: ClinicModuleKey,
  checked: boolean,
): ReadonlySet<ClinicModuleKey> {
  const next = new Set(selected);
  if (checked) {
    let current: ClinicModuleKey | undefined = key;
    while (current !== undefined && !next.has(current)) {
      next.add(current);
      current = MODULE_PREREQUISITE[current];
    }
  } else {
    const toRemove: ClinicModuleKey[] = [key];
    for (let current = toRemove.pop(); current !== undefined; current = toRemove.pop()) {
      if (next.delete(current)) {
        toRemove.push(...(DEPENDENTS_OF[current] ?? []));
      }
    }
  }
  return next;
}
