import type { z } from 'zod';

import type { OperatorAccess } from '@/features/auth/policy/types';
import type { accessRoleSchema, myAccessSchema } from '@/features/auth/schemas/myAccess';
import { platformUserSchema } from '@/features/users';
import type { roleSchema } from '@/features/users/schemas/role';
import type { userPageSchema } from '@/features/users/schemas/userPage';

import { uuidOf } from './ids';

/** The users service speaks snake_case; these are the types of its answers (schema inputs). */
export type UserDto = z.input<typeof platformUserSchema>;
export type RoleDto = z.input<typeof accessRoleSchema>;
export type MyAccessDto = z.input<typeof myAccessSchema>;
export type RoleRecordDto = z.input<typeof roleSchema>;
export type UserPageDto = z.input<typeof userPageSchema>;

/** A user as the users service returns it: active, with the id `uuidOf(121)` and a maternal last name. */
export function userDto(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: uuidOf(121),
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

/**
 * A role of the catalog as the roles endpoints send it (R1 and U10): active Marketing by default.
 * It is not the role of `me`, which carries permissions instead of a description (`roleDto`).
 */
export function roleRecordDto(overrides: Partial<RoleRecordDto> = {}): RoleRecordDto {
  return {
    id: 4,
    name: 'Marketing',
    description: null,
    created_at: '2026-10-15T05:57:30.521Z',
    status: { id: 1, name: 'Activo' },
    ...overrides,
  };
}

/** A page of the list of users with one user, as the service sends it. */
export function userPageDto(overrides: Partial<UserPageDto> = {}): UserPageDto {
  return { items: [userDto()], total: 1, page: 1, page_size: 10, pages: 1, ...overrides };
}

/** The page asked for out of all the active users: it works out the total and the number of pages. */
export function userPageDtoOf(
  users: readonly UserDto[],
  { page = 1, pageSize = 10 }: { readonly page?: number; readonly pageSize?: number } = {},
): UserPageDto {
  return {
    items: users.slice((page - 1) * pageSize, page * pageSize),
    total: users.length,
    page,
    page_size: pageSize,
    pages: Math.ceil(users.length / pageSize),
  };
}

/** The answer of `GET /api/v1/authorization/me`: a user with one authorized role by default. */
export function myAccessDto(overrides: Partial<MyAccessDto> = {}): MyAccessDto {
  return { user: userDto(), roles: [roleDto()], ...overrides };
}

/**
 * Domain model of a person who may enter, with the Administrator permissions by default: every
 * action on the three sections and the reading of the roles (feature 002).
 */
export function operatorAccess(overrides: Partial<OperatorAccess> = {}): OperatorAccess {
  const permissions = [
    ...['users', 'subscriptions', 'tenants'].flatMap((resource) =>
      ['read', 'write', 'update', 'delete'].map((action) => `${resource}:${action}`),
    ),
    'roles:read',
  ];
  const administrator = { id: 1, name: 'Administrator', permissions };
  return {
    user: platformUserSchema.parse(userDto()),
    roles: [administrator],
    authorizedRoles: [administrator],
    permissions: new Set(permissions),
    ...overrides,
  };
}
