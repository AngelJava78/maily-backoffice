import { z } from 'zod';

/** The only parameters the list writes in its address (see `subscriptionsLocation`). */
const LIST_PARAMETERS: ReadonlySet<string> = new Set(['page', 'page_size']);

/**
 * The search of the list that the person comes from, to go back to the same page. It is rebuilt
 * into an address, so only what the list itself writes is accepted: a question mark and the
 * parameters of the list, nothing that could send the person somewhere else.
 */
const listSearchSchema = z
  .string()
  .max(300)
  .refine(
    (value) =>
      value.startsWith('?') &&
      [...new URLSearchParams(value.slice(1)).keys()].every((key) => LIST_PARAMETERS.has(key)),
  );

const stateSchema = z.object({
  listSearch: listSearchSchema.optional().catch(undefined),
});

export type SubscriptionDetailLocationState = z.output<typeof stateSchema>;

/**
 * What the history entry carries when the detail, the creation or the edition of a subscription is
 * opened, and when the list is opened again after a deletion. The state of a history entry is not
 * trusted (constitution II): what is not valid is dropped, and anything that is not an object gives
 * an empty state. It never throws.
 */
export function parseSubscriptionDetailState(state: unknown): SubscriptionDetailLocationState {
  const parsed = stateSchema.safeParse(state);
  return parsed.success ? parsed.data : {};
}
