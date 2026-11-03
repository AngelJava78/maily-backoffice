import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import { platformUserDtoSchema, toPlatformUser } from './user';
import { ROLE_TYPE_ID_OF_USERS_FILTER } from './usersLocation';

/** The type of a role (1 Sistema, 2 Clínica), taken from the catalog of the users service. */
const roleTypeSchema = z.object({ id: z.number().int(), name: z.string().min(1) });

export type RoleType = z.output<typeof roleTypeSchema>;

/**
 * A user of the list (users API 5.5.0, feature 026): the usual user plus `role_types`, the types
 * of its active roles, without repeats and sorted by id, empty when it has none. The field is
 * required: an older API, which would ignore the filters, fails here instead of showing active
 * users under «Bloqueados» (research D2).
 */
export const userListItemSchema = platformUserDtoSchema
  .extend({ role_types: z.array(roleTypeSchema) })
  .transform((dto) => ({ ...toPlatformUser(dto), roleTypes: dto.role_types }));

export type UserListItem = z.output<typeof userListItemSchema>;

/** The words of the type buttons for the types the Backoffice knows, by id (1 Sistema, 2 Clínica). */
const TYPE_TEXT_BY_ID: ReadonlyMap<number, string> = new Map([
  [ROLE_TYPE_ID_OF_USERS_FILTER.system, messages.users.filters.type.system],
  [ROLE_TYPE_ID_OF_USERS_FILTER.clinic, messages.users.filters.type.clinic],
]);

/**
 * The text of the Tipo column (FR-006, research D7): «Sistema», «Clínica», «Sistema y Clínica», or
 * «—» without active roles. It decides by the id; a type the Backoffice does not know shows the
 * name of the catalog, which is edited by hand.
 */
export function describeUserType(roleTypes: readonly RoleType[]): string {
  const names = roleTypes.map((type) => TYPE_TEXT_BY_ID.get(type.id) ?? type.name);
  const last = names.at(-1);
  if (last === undefined) {
    return messages.users.list.noType;
  }
  return names.length === 1
    ? last
    : messages.users.list.typeJoin(names.slice(0, -1).join(', '), last);
}
