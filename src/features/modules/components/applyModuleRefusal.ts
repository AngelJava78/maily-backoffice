import type { UseFormSetError } from 'react-hook-form';

import type { ModuleErrorOutcome, ModuleFormField } from '../api/moduleErrors';
import type { ModuleFormValues } from '../schemas/moduleForm';

/** The inputs a refusal can name, in the order in which they appear on screen. */
const FORM_FIELDS: readonly ModuleFormField[] = ['type', 'key', 'name', 'description', 'sortOrder'];

/**
 * Puts a refusal of the API where the person sees it (same pattern as `applyRefusal` of
 * subscriptions): the errors of the fields next to them, with the focus on the first one, or a
 * general error, which is returned for the panel. A lack of permission gives none: the application
 * already told it.
 */
export function applyModuleRefusal(
  outcome: ModuleErrorOutcome,
  setError: UseFormSetError<ModuleFormValues>,
): string | undefined {
  if (outcome.kind === 'field') {
    FORM_FIELDS.filter((field) => outcome.fields[field] !== undefined).forEach((field, index) => {
      setError(field, { type: 'server', message: outcome.fields[field] }, { shouldFocus: index === 0 });
    });
    return undefined;
  }
  return outcome.kind === 'forbidden' ? undefined : outcome.message;
}
