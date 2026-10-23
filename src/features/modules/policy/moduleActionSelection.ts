import { REQUIRED_ACTION_KEY, type ModuleActionKey } from '../schemas/moduleActionCatalog';

/** Toggles one action; "read" can never be unchecked (FR-018). Never mutates `selected`. */
export function withActionChecked(
  selected: ReadonlySet<ModuleActionKey>,
  action: ModuleActionKey,
  checked: boolean,
): ReadonlySet<ModuleActionKey> {
  const next = new Set(selected);
  if (action === REQUIRED_ACTION_KEY && !checked) {
    return next;
  }
  if (checked) {
    next.add(action);
  } else {
    next.delete(action);
  }
  return next;
}
