import type { UseFormSetError } from 'react-hook-form';

import type {
  ComponentFormField,
  MonitoredComponentErrorOutcome,
} from '../api/monitoredComponentErrors';
import type { ComponentFormValues } from '../schemas/componentForm';

/** The inputs a refusal can name, in the order in which they appear on screen. */
const FORM_FIELDS: readonly ComponentFormField[] = [
  'name',
  'code',
  'kind',
  'baseUrl',
  'livePath',
  'readyPath',
  'infoPath',
  'enabled',
  'sortOrder',
];

/**
 * Puts a refusal of the service where the person sees it, with our texts (FR-039): the errors of
 * the fields next to them, with the focus on the first one, or a general error, which is returned
 * for the frame of the form. A lack of permission gives none: the application already told it. What
 * was written stays in the form.
 */
export function applyComponentRefusal(
  outcome: MonitoredComponentErrorOutcome,
  setError: UseFormSetError<ComponentFormValues>,
): string | undefined {
  if (outcome.kind === 'field') {
    FORM_FIELDS.filter((field) => outcome.fields[field] !== undefined).forEach((field, index) => {
      setError(
        field,
        { type: 'server', message: outcome.fields[field] },
        { shouldFocus: index === 0 },
      );
    });
    return undefined;
  }
  return outcome.kind === 'forbidden' ? undefined : outcome.message;
}
