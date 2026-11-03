import { z } from 'zod';

/** The only parameters the table writes in its address (see `rolePermissionsLocation`). */
const LIST_PARAMETERS: ReadonlySet<string> = new Set(['type', 'status', 'page', 'page_size']);

/**
 * The search of the table that the person comes from, to go back to the same filters and page
 * (FR-013, research D6). It is rebuilt into an address, so only what the table itself writes is
 * accepted: a question mark and the parameters of the table, nothing that could send the person
 * somewhere else.
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

export type RoleDetailLocationState = z.output<typeof stateSchema>;

/**
 * What the history entry carries when the detail of a role is opened. The state of a history entry
 * is not trusted (constitution II): each part that is not valid is dropped, and anything that is not
 * an object gives an empty state. It never throws.
 */
export function parseRoleDetailState(state: unknown): RoleDetailLocationState {
  const parsed = stateSchema.safeParse(state);
  return parsed.success ? parsed.data : {};
}
