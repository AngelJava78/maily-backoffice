import type { z } from 'zod';

import type { OperatorAccess } from '@/features/auth/policy/types';
import type { accessRoleSchema, myAccessSchema } from '@/features/auth/schemas/myAccess';
import { platformUserSchema } from '@/features/users';

/** The users service speaks snake_case; these are the types of its answers (schema inputs). */
export type UserDto = z.input<typeof platformUserSchema>;
export type RoleDto = z.input<typeof accessRoleSchema>;
export type MyAccessDto = z.input<typeof myAccessSchema>;

/** A user as the users service returns it: active, with the id 121 and a maternal last name. */
export function userDto(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 121,
    auth0_id: 'auth0|user1',
    email: 'ana@clinica.com',
    first_name: 'Ana',
    paternal_last_name: 'Pérez',
    maternal_last_name: 'Gómez',
    status: { id: 1, name: 'Activo' },
    created_at: '2026-10-15T14:20:11.032Z',
    updated_at: '2026-10-15T14:20:11.032Z',
    ...overrides,
  };
}

/** An active role with its active permissions; by default Marketing with `tenants:read`. */
export function roleDto(overrides: Partial<RoleDto> = {}): RoleDto {
  return { id: 4, name: 'Marketing', permissions: ['tenants:read'], ...overrides };
}

/** The answer of `GET /api/v1/authorization/me`: a user with one authorized role by default. */
export function myAccessDto(overrides: Partial<MyAccessDto> = {}): MyAccessDto {
  return { user: userDto(), roles: [roleDto()], ...overrides };
}

/** Domain model of a person who may enter, with the Administrator permissions by default. */
export function operatorAccess(overrides: Partial<OperatorAccess> = {}): OperatorAccess {
  const permissions = ['users', 'subscriptions', 'tenants'].flatMap((resource) =>
    ['read', 'write', 'update', 'delete'].map((action) => `${resource}:${action}`),
  );
  const administrator = { id: 1, name: 'Administrator', permissions };
  return {
    user: platformUserSchema.parse(userDto()),
    roles: [administrator],
    authorizedRoles: [administrator],
    permissions: new Set(permissions),
    ...overrides,
  };
}
