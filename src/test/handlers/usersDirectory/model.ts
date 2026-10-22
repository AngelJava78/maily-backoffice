import type { MyAccessDto, RoleDto, RoleRecordDto, UserDto, UserPageDto } from '../../factories';
import { numberOf, uuidOf } from '../../ids';

/** Ids of the statuses of the users and of the roles of the service. */
const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

const STATUS_NAMES: ReadonlyMap<number, string> = new Map([
  [ACTIVE, 'Activo'],
  [BLOCKED, 'Bloqueado'],
  [DELETED, 'Eliminado'],
]);

/** Ids of the role types of the platform catalog (feature 006); mirrors `roleTypes.ts` locally,
 * the same way the statuses above mirror `userStatus.ts`: this simulator does not import from
 * `features/auth`. */
const SYSTEM_TYPE = 1;
const CLINIC_TYPE = 2;

const TYPE_NAMES: ReadonlyMap<number, string> = new Map([
  [SYSTEM_TYPE, 'Sistema'],
  [CLINIC_TYPE, 'Clínica'],
]);

export interface DirectoryUser {
  readonly id: string;
  readonly auth0Id: string;
  readonly email: string;
  readonly firstName: string;
  readonly paternalLastName: string;
  readonly maternalLastName: string | null;
  readonly statusId: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DirectoryRole {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly statusId: number;
  /** Type of the role (feature 006): 1 Sistema gives access to the Backoffice, 2 Clínica does not. */
  readonly typeId: number;
  readonly permissions: readonly string[];
}

export interface DirectoryInitial {
  readonly users: readonly DirectoryUser[];
  readonly roles: readonly DirectoryRole[];
  /** Which roles each user has, whatever the status of the user or of the role. */
  readonly associations: readonly { readonly userId: string; readonly roleId: number }[];
}

export interface NewUser {
  readonly email: string;
  readonly firstName: string;
  readonly paternalLastName: string;
  readonly maternalLastName?: string | null;
}

export interface UserChanges {
  readonly firstName?: string;
  readonly paternalLastName?: string;
  readonly maternalLastName?: string | null;
}

/** What the service does between checking the status of a user and changing it; it may refuse. */
export type StatusCheck = (user: DirectoryUser) => void;

/** A refusal of the service: the status, the `code` and a message in Spanish without personal data. */
export class DirectoryError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly { readonly field: string; readonly message: string }[] | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: readonly { readonly field: string; readonly message: string }[],
  ) {
    super(message);
    this.name = 'DirectoryError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** A user with sensible defaults: active, with an email and a name that depend on its id. */
export function directoryUser(overrides: Partial<DirectoryUser> = {}): DirectoryUser {
  const id = overrides.id ?? uuidOf(1);
  const label = numberOf(id) ?? id;
  return {
    id,
    auth0Id: `auth0|sim-${label}`,
    email: `user${label}@ejemplo.com`,
    firstName: 'Usuario',
    paternalLastName: `Prueba ${label}`,
    maternalLastName: null,
    statusId: ACTIVE,
    createdAt: '2026-10-15T14:20:11.032Z',
    updatedAt: '2026-10-15T14:20:11.032Z',
    ...overrides,
  };
}

/**
 * An active role without permissions, unless said otherwise; of type Sistema by default
 * (feature 006, research D8), so the many tests that seed roles without caring about the type
 * keep giving access as before. A role that must stand for one that does not give access to the
 * Backoffice needs `typeId: 2` (Clínica) explicitly.
 */
export function directoryRole(overrides: Partial<DirectoryRole> = {}): DirectoryRole {
  const id = overrides.id ?? 1;
  return {
    id,
    name: `Role ${id}`,
    description: null,
    createdAt: '2026-10-15T05:57:30.521Z',
    statusId: ACTIVE,
    typeId: SYSTEM_TYPE,
    permissions: [],
    ...overrides,
  };
}

function statusOf(statusId: number): { id: number; name: string } {
  return { id: statusId, name: STATUS_NAMES.get(statusId) ?? 'Desconocido' };
}

export function toUserDto(user: DirectoryUser): UserDto {
  return {
    id: user.id,
    auth0_id: user.auth0Id,
    email: user.email,
    first_name: user.firstName,
    paternal_last_name: user.paternalLastName,
    maternal_last_name: user.maternalLastName,
    status: statusOf(user.statusId),
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export function toRoleRecordDto(role: DirectoryRole): RoleRecordDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    created_at: role.createdAt,
    status: statusOf(role.statusId),
  };
}

const collator = new Intl.Collator('es', { sensitivity: 'base' });

/** Without a maternal last name goes after the ones that have one. */
function compareMaternalLastName(a: DirectoryUser, b: DirectoryUser): number {
  if (a.maternalLastName === b.maternalLastName) {
    return 0;
  }
  if (a.maternalLastName === null) {
    return 1;
  }
  if (b.maternalLastName === null) {
    return -1;
  }
  return collator.compare(a.maternalLastName, b.maternalLastName);
}

/** The fixed order of the list: name, paternal and maternal last name, then id. */
function byName(a: DirectoryUser, b: DirectoryUser): number {
  return (
    collator.compare(a.firstName, b.firstName) ||
    collator.compare(a.paternalLastName, b.paternalLastName) ||
    compareMaternalLastName(a, b) ||
    a.id.localeCompare(b.id)
  );
}

const byRoleName = (a: DirectoryRole, b: DirectoryRole): number => collator.compare(a.name, b.name);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function orNull(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** The refusal for a user whose status does not admit the operation. */
function statusConflict(statusId: number): DirectoryError {
  switch (statusId) {
    case ACTIVE:
      return new DirectoryError(409, 'user_already_active', 'El usuario ya está activo.');
    case BLOCKED:
      return new DirectoryError(409, 'user_blocked', 'El usuario está bloqueado.');
    case DELETED:
      return new DirectoryError(409, 'user_deleted', 'El usuario está eliminado.');
    default:
      return new DirectoryError(409, 'user_not_active', 'El usuario no está activo.');
  }
}

const userNotFound = (): DirectoryError =>
  new DirectoryError(404, 'user_not_found', 'El usuario no existe.');

const roleNotFound = (): DirectoryError =>
  new DirectoryError(404, 'role_not_found', 'El role no existe o no está activo.');

/**
 * The data of the users service and its rules (contracts/users-service.md), in memory and without
 * network: users with a status, the catalog of roles, who has which role and the permissions of
 * every role. The handlers of the simulator are a thin layer of HTTP over these operations.
 * The operations that apply a rule raise a `DirectoryError`; the queries and the helpers to
 * prepare data never do.
 */
export function createDirectoryModel(initial: DirectoryInitial) {
  let users: DirectoryUser[] = [...initial.users];
  let roles: DirectoryRole[] = [...initial.roles];
  const links: { userId: string; roleId: number }[] = initial.associations.map((link) => ({
    ...link,
  }));
  // A logical clock: dates move forward one second per change and never depend on the real time.
  let tick = 0;
  const now = (): string => new Date(Date.UTC(2026, 9, 18, 12, 0, tick++)).toISOString();

  const findUser = (id: string): DirectoryUser | undefined => users.find((user) => user.id === id);
  const findRole = (id: number): DirectoryRole | undefined => roles.find((role) => role.id === id);
  const findByEmail = (email: string): DirectoryUser | undefined =>
    users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));

  function replaceUser(user: DirectoryUser): DirectoryUser {
    users = users.map((current) => (current.id === user.id ? user : current));
    return user;
  }

  function replaceRole(role: DirectoryRole): void {
    roles = roles.map((current) => (current.id === role.id ? role : current));
  }

  function getUser(id: string): DirectoryUser {
    const user = findUser(id);
    if (user === undefined) {
      throw userNotFound();
    }
    return user;
  }

  /** The user, which must exist and be active. */
  function getActiveUser(id: string): DirectoryUser {
    const user = getUser(id);
    if (user.statusId !== ACTIVE) {
      throw statusConflict(user.statusId);
    }
    return user;
  }

  /** The roles a user has, whatever their status. */
  function rolesOf(userId: string): DirectoryRole[] {
    return links
      .filter((link) => link.userId === userId)
      .flatMap((link) => findRole(link.roleId) ?? []);
  }

  function activeRolesOf(userId: string): DirectoryRole[] {
    return rolesOf(userId).filter((role) => role.statusId === ACTIVE);
  }

  /**
   * Moves a user from one status to another. `beforeChange` runs once the status is known to admit
   * the change and before it is applied: it is where the service calls the access account, and if
   * it throws the user keeps its status.
   */
  function changeStatus(
    id: string,
    from: number,
    to: number,
    beforeChange?: StatusCheck,
  ): DirectoryUser {
    const user = getUser(id);
    if (user.statusId !== from) {
      throw statusConflict(user.statusId);
    }
    beforeChange?.(user);
    return replaceUser({ ...user, statusId: to, updatedAt: now() });
  }

  function nextId(items: readonly { readonly id: number }[]): number {
    return items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
  }

  /** The id of the next user: the number after the highest one made with `uuidOf`, as a UUID. */
  function nextUserId(): string {
    return uuidOf(
      users.reduce((highest, user) => Math.max(highest, numberOf(user.id) ?? 0), 0) + 1,
    );
  }

  return {
    // --- Queries ---
    users: (): readonly DirectoryUser[] => users,
    roles: (): readonly DirectoryRole[] => roles,
    findUser,
    findRole,
    findByEmail,
    rolesOf,

    /** The union of the permissions of the active roles of an active user; nothing otherwise. */
    permissionsOf(auth0Id: string): ReadonlySet<string> {
      const user = users.find((current) => current.auth0Id === auth0Id);
      if (user?.statusId !== ACTIVE) {
        return new Set();
      }
      return new Set(activeRolesOf(user.id).flatMap((role) => role.permissions));
    },

    /** The answer of `me`: who the person is and, if active, the active roles with permissions. */
    accessOf(auth0Id: string): MyAccessDto {
      const user = users.find((current) => current.auth0Id === auth0Id);
      if (user === undefined) {
        return { user: null, roles: [] };
      }
      const accessRoles: RoleDto[] =
        user.statusId === ACTIVE
          ? activeRolesOf(user.id)
              .sort(byRoleName)
              .map((role) => ({
                id: role.id,
                name: role.name,
                type: { id: role.typeId, name: TYPE_NAMES.get(role.typeId) ?? 'Desconocido' },
                permissions: [...role.permissions].sort(),
              }))
          : [];
      return { user: toUserDto(user), roles: accessRoles };
    },

    /** A page of the active users; past the last page there are no items, which is not an error. */
    listActiveUsers(page: number, pageSize: number): UserPageDto {
      const active = users.filter((user) => user.statusId === ACTIVE).sort(byName);
      return {
        items: active.slice((page - 1) * pageSize, page * pageSize).map(toUserDto),
        total: active.length,
        page,
        page_size: pageSize,
        pages: Math.ceil(active.length / pageSize),
      };
    },

    /** The catalog that can be assigned: every active role, sorted by name. */
    listActiveRoles(): RoleRecordDto[] {
      return roles
        .filter((role) => role.statusId === ACTIVE)
        .sort(byRoleName)
        .map(toRoleRecordDto);
    },

    // --- Operations that apply the rules of the service ---
    getUser,

    getUserByEmail(email: string): DirectoryUser {
      const user = findByEmail(email);
      if (user === undefined) {
        throw userNotFound();
      }
      return user;
    },

    createUser(input: NewUser): DirectoryUser {
      if (findByEmail(input.email) !== undefined) {
        throw new DirectoryError(
          409,
          'user_email_already_registered',
          'El correo ya está registrado.',
        );
      }
      const id = nextUserId();
      const timestamp = now();
      const user: DirectoryUser = {
        id,
        auth0Id: `auth0|sim-${numberOf(id)}`,
        email: normalizeEmail(input.email),
        firstName: input.firstName.trim(),
        paternalLastName: input.paternalLastName.trim(),
        maternalLastName: orNull(input.maternalLastName),
        statusId: ACTIVE,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      users = [...users, user];
      return user;
    },

    updateUser(id: string, changes: UserChanges): DirectoryUser {
      const user = getActiveUser(id);
      return replaceUser({
        ...user,
        firstName: changes.firstName?.trim() ?? user.firstName,
        paternalLastName: changes.paternalLastName?.trim() ?? user.paternalLastName,
        maternalLastName:
          changes.maternalLastName === undefined
            ? user.maternalLastName
            : orNull(changes.maternalLastName),
        updatedAt: now(),
      });
    },

    blockUser: (id: string, beforeChange?: StatusCheck): DirectoryUser =>
      changeStatus(id, ACTIVE, BLOCKED, beforeChange),
    unblockUser: (id: string, beforeChange?: StatusCheck): DirectoryUser =>
      changeStatus(id, BLOCKED, ACTIVE, beforeChange),
    deleteUser: (id: string, beforeChange?: StatusCheck): DirectoryUser =>
      changeStatus(id, ACTIVE, DELETED, beforeChange),
    reactivateUser: (id: string, beforeChange?: StatusCheck): DirectoryUser =>
      changeStatus(id, DELETED, ACTIVE, beforeChange),

    /** The active roles of an active user, sorted by name. */
    listUserRoles(userId: string): RoleRecordDto[] {
      getActiveUser(userId);
      return activeRolesOf(userId).sort(byRoleName).map(toRoleRecordDto);
    },

    associateRole(userId: string, roleId: number): DirectoryRole {
      getActiveUser(userId);
      const role = findRole(roleId);
      if (role?.statusId !== ACTIVE) {
        throw roleNotFound();
      }
      if (links.some((link) => link.userId === userId && link.roleId === roleId)) {
        throw new DirectoryError(
          409,
          'user_role_already_associated',
          'El usuario ya tiene ese role.',
        );
      }
      links.push({ userId, roleId });
      return role;
    },

    disassociateRole(userId: string, roleId: number): void {
      getActiveUser(userId);
      // As when a role is given: the role has to be active, or it is as if it did not exist.
      if (findRole(roleId)?.statusId !== ACTIVE) {
        throw roleNotFound();
      }
      const index = links.findIndex((link) => link.userId === userId && link.roleId === roleId);
      if (index === -1) {
        throw new DirectoryError(409, 'user_role_not_associated', 'El usuario no tiene ese role.');
      }
      links.splice(index, 1);
    },

    // --- Helpers to prepare the data of a test, which apply no rule ---
    addUser: (overrides: Partial<DirectoryUser> = {}): DirectoryUser => {
      const user = directoryUser({ ...overrides, id: overrides.id ?? nextUserId() });
      users = [...users, user];
      return user;
    },

    addRole: (overrides: Partial<DirectoryRole> = {}): DirectoryRole => {
      const role = directoryRole({ ...overrides, id: overrides.id ?? nextId(roles) });
      roles = [...roles, role];
      return role;
    },

    /** Gives a user a role without checking anything. */
    assign: (userId: string, roleId: number): void => {
      if (!links.some((link) => link.userId === userId && link.roleId === roleId)) {
        links.push({ userId, roleId });
      }
    },

    setUserStatus: (id: string, statusId: number): void => {
      replaceUser({ ...getUser(id), statusId });
    },

    setRoleStatus: (id: number, statusId: number): void => {
      const role = findRole(id);
      if (role === undefined) {
        throw roleNotFound();
      }
      replaceRole({ ...role, statusId });
    },

    grant: (roleName: string, permission: string): void => {
      const role = roles.find((current) => current.name === roleName);
      if (role === undefined) {
        throw new Error(`There is no role called ${roleName}`);
      }
      if (!role.permissions.includes(permission)) {
        replaceRole({ ...role, permissions: [...role.permissions, permission] });
      }
    },

    revoke: (roleName: string, permission: string): void => {
      const role = roles.find((current) => current.name === roleName);
      if (role === undefined) {
        throw new Error(`There is no role called ${roleName}`);
      }
      replaceRole({ ...role, permissions: role.permissions.filter((item) => item !== permission) });
    },
  };
}

export type DirectoryModel = ReturnType<typeof createDirectoryModel>;
