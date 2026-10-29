import type { ModuleActionKey } from '../schemas/moduleActionCatalog';

/** Toggles one action, "read" included like any other (022, FR-012). Never mutates `selected`. */
export function withActionChecked(
  selected: ReadonlySet<ModuleActionKey>,
  action: ModuleActionKey,
  checked: boolean,
): ReadonlySet<ModuleActionKey> {
  const next = new Set(selected);
  if (checked) {
    next.add(action);
  } else {
    next.delete(action);
  }
  return next;
}
