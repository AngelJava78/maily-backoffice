import type { UseFormSetError } from 'react-hook-form';

import type { SubscriptionErrorOutcome, SubscriptionFormField } from '../api/subscriptionErrors';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';

/** The inputs a refusal can name, in the order in which they appear on screen. */
const FORM_FIELDS: readonly SubscriptionFormField[] = [
  'name',
  'description',
  'monthlyPrice',
  'annualPrice',
  'trialDays',
  'selfService',
  'moduleKeys',
  'consultingRoomsLimit',
  'doctorsLimit',
  'assistantsLimit',
  'newPatientsPerYearLimit',
  'otherFeatures',
];

/**
 * Puts a refusal of the API where the person sees it, with our texts (FR-010): the errors of the
 * fields next to them, with the focus on the first one, or a general error, which is returned for
 * the frame of the form. A lack of permission gives none: the application already told it.
 */
export function applyRefusal(
  outcome: SubscriptionErrorOutcome,
  setError: UseFormSetError<SubscriptionFormValues>,
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
