import { z } from 'zod';

/** The only parameters the list writes in its address (see `usersLocation`). */
const LIST_PARAMETERS: ReadonlySet<string> = new Set(['page', 'page_size', 'email']);

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

/** Roles that could not be assigned after creating a user (FR-023); the detail offers to retry. */
const rolesNotAssignedSchema = z
  .array(z.object({ id: z.number().int().min(1), name: z.string().min(1).max(50) }))
  .max(100);

const stateSchema = z.object({
  listSearch: listSearchSchema.optional().catch(undefined),
  rolesNotAssigned: rolesNotAssignedSchema.optional().catch(undefined),
});

export type UserDetailLocationState = z.output<typeof stateSchema>;

/**
 * What the history entry carries when the detail of a user is opened. The state of a history entry
 * is not trusted (constitution II): each part that is not valid is dropped, and anything that is not
 * an object gives an empty state. It never throws.
 */
export function parseUserDetailState(state: unknown): UserDetailLocationState {
  const parsed = stateSchema.safeParse(state);
  return parsed.success ? parsed.data : {};
}
