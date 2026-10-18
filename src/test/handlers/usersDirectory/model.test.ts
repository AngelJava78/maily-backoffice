import { describe, expect, it } from 'vitest';

import {
  createDirectoryModel,
  DirectoryError,
  directoryRole,
  directoryUser,
  type DirectoryInitial,
} from './model';

const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

function build(initial: Partial<DirectoryInitial> = {}) {
  return createDirectoryModel({
    users: initial.users ?? [],
    roles: initial.roles ?? [],
    associations: initial.associations ?? [],
  });
}

/** Runs `action` and gives the error of the service that it raised. */
function failureOf(action: () => unknown): DirectoryError {
  try {
    action();
  } catch (error) {
    if (error instanceof DirectoryError) {
      return error;
    }
    throw error;
  }
  throw new Error('The action did not fail');
}

describe('permissionsOf', () => {
  const marketing = directoryRole({ id: 4, name: 'Marketing', permissions: ['tenants:read'] });
  const doctor = directoryRole({ id: 6, name: 'Doctor', permissions: ['tenants:read', 'x:write'] });

  it('is the union of the permissions of the active roles of an active user', () => {
    const model = build({
      users: [directoryUser({ id: 2, auth0Id: 'auth0|ana' })],
      roles: [marketing, doctor],
      associations: [
        { userId: 2, roleId: 4 },
        { userId: 2, roleId: 6 },
      ],
    });

    expect([...model.permissionsOf('auth0|ana')].sort()).toEqual(['tenants:read', 'x:write']);
  });

  it('leaves out the roles that are not active', () => {
    const model = build({
      users: [directoryUser({ id: 2, auth0Id: 'auth0|ana' })],
      roles: [marketing, directoryRole({ ...doctor, statusId: BLOCKED })],
      associations: [
        { userId: 2, roleId: 4 },
        { userId: 2, roleId: 6 },
      ],
    });

    expect([...model.permissionsOf('auth0|ana')]).toEqual(['tenants:read']);
  });

  it.each([
    ['blocked', BLOCKED],
    ['deleted', DELETED],
  ])('is empty for a %s user, whatever roles it keeps', (_label, statusId) => {
    const model = build({
      users: [directoryUser({ id: 2, auth0Id: 'auth0|ana', statusId })],
      roles: [marketing],
      associations: [{ userId: 2, roleId: 4 }],
    });

    expect(model.permissionsOf('auth0|ana').size).toBe(0);
  });

  it('is empty for someone who is not registered', () => {
    expect(build().permissionsOf('auth0|nobody').size).toBe(0);
  });
});

describe('accessOf (the answer of `me`)', () => {
  const roles = [
    directoryRole({ id: 6, name: 'Doctor', permissions: ['tenants:read'] }),
    directoryRole({ id: 4, name: 'Marketing', permissions: ['tenants:update', 'tenants:read'] }),
    directoryRole({ id: 7, name: 'Support', statusId: BLOCKED, permissions: ['x:read'] }),
  ];
  const associations = [
    { userId: 2, roleId: 6 },
    { userId: 2, roleId: 4 },
    { userId: 2, roleId: 7 },
  ];

  it('has no user and no roles for someone who is not registered', () => {
    expect(build().accessOf('auth0|nobody')).toEqual({ user: null, roles: [] });
  });

  it.each([BLOCKED, DELETED])('has the user but no roles when its status is %i', (statusId) => {
    const model = build({
      users: [directoryUser({ id: 2, auth0Id: 'auth0|ana', statusId })],
      roles,
      associations,
    });

    const access = model.accessOf('auth0|ana');

    expect(access.user?.id).toBe(2);
    expect(access.roles).toEqual([]);
  });

  it('has the active roles sorted by name, each with its permissions sorted', () => {
    const model = build({
      users: [directoryUser({ id: 2, auth0Id: 'auth0|ana' })],
      roles,
      associations,
    });

    expect(model.accessOf('auth0|ana').roles).toEqual([
      { id: 6, name: 'Doctor', permissions: ['tenants:read'] },
      { id: 4, name: 'Marketing', permissions: ['tenants:read', 'tenants:update'] },
    ]);
  });
});

describe('listActiveUsers', () => {
  it('lists only the active users, by name, paternal and maternal last name, then by id', () => {
    const model = build({
      users: [
        directoryUser({ id: 1, firstName: 'beto', paternalLastName: 'Ruiz' }),
        directoryUser({ id: 2, firstName: 'Ana', paternalLastName: 'Zamora' }),
        directoryUser({
          id: 3,
          firstName: 'Ana',
          paternalLastName: 'Pérez',
          maternalLastName: null,
        }),
        directoryUser({
          id: 4,
          firstName: 'Ana',
          paternalLastName: 'Pérez',
          maternalLastName: 'Gómez',
        }),
        directoryUser({
          id: 5,
          firstName: 'Ana',
          paternalLastName: 'Pérez',
          maternalLastName: 'gómez',
        }),
        directoryUser({ id: 6, firstName: 'Aaron', paternalLastName: 'Cruz', statusId: BLOCKED }),
        directoryUser({ id: 7, firstName: 'Aaron', paternalLastName: 'Cruz', statusId: DELETED }),
      ],
    });

    const page = model.listActiveUsers(1, 50);

    expect(page.items.map((user) => user.id)).toEqual([4, 5, 3, 2, 1]);
    expect(page).toMatchObject({ total: 5, page: 1, page_size: 50, pages: 1 });
  });

  it('counts only the active users in the total and in the number of pages', () => {
    const users = Array.from({ length: 25 }, (_, i) => directoryUser({ id: i + 1 }));
    const model = build({
      users: [...users, directoryUser({ id: 99, statusId: BLOCKED })],
    });

    expect(model.listActiveUsers(1, 10)).toMatchObject({ total: 25, pages: 3 });
    expect(model.listActiveUsers(3, 10).items).toHaveLength(5);
  });

  it('answers a page past the last one with no items, not with an error', () => {
    const model = build({ users: [directoryUser({ id: 1 })] });

    expect(model.listActiveUsers(9, 10)).toMatchObject({
      items: [],
      total: 1,
      page: 9,
      pages: 1,
    });
  });

  it('has no pages when there are no active users', () => {
    expect(build().listActiveUsers(1, 50)).toMatchObject({ items: [], total: 0, pages: 0 });
  });
});

describe('findByEmail', () => {
  const model = build({
    users: [
      directoryUser({ id: 1, email: 'ana@clinica.com' }),
      directoryUser({ id: 2, email: 'beto@clinica.com', statusId: BLOCKED }),
      directoryUser({ id: 3, email: 'carla@clinica.com', statusId: DELETED }),
    ],
  });

  it('ignores the case and the spaces around the email', () => {
    expect(model.findByEmail('  ANA@Clinica.com ')?.id).toBe(1);
  });

  it('finds the user whatever its status', () => {
    expect(model.findByEmail('beto@clinica.com')?.statusId).toBe(BLOCKED);
    expect(model.findByEmail('carla@clinica.com')?.statusId).toBe(DELETED);
  });

  it('finds nobody for an email that is not registered', () => {
    expect(model.findByEmail('nadie@clinica.com')).toBeUndefined();
  });
});

describe('createUser', () => {
  it('stores an active user with the email in lower case and the texts trimmed', () => {
    const model = build({ users: [directoryUser({ id: 7 })] });

    const user = model.createUser({
      email: 'Nueva@Clinica.COM',
      firstName: ' Nora ',
      paternalLastName: ' Díaz ',
      maternalLastName: ' Vega ',
    });

    expect(user).toMatchObject({
      id: 8,
      email: 'nueva@clinica.com',
      firstName: 'Nora',
      paternalLastName: 'Díaz',
      maternalLastName: 'Vega',
      statusId: ACTIVE,
      auth0Id: 'auth0|sim-8',
    });
    expect(model.findUser(8)).toEqual(user);
  });

  it.each([undefined, null, '', '   '])(
    'has no maternal last name when it comes as %j',
    (maternalLastName) => {
      const user = build().createUser({
        email: 'a@b.co',
        firstName: 'A',
        paternalLastName: 'B',
        maternalLastName,
      });

      expect(user.maternalLastName).toBeNull();
    },
  );

  it.each([
    ['active', ACTIVE],
    ['blocked', BLOCKED],
    ['deleted', DELETED],
  ])('rejects an email that belongs to a %s user, in any case', (_label, statusId) => {
    const model = build({ users: [directoryUser({ id: 1, email: 'ana@clinica.com', statusId })] });

    const failure = failureOf(() =>
      model.createUser({ email: ' ANA@clinica.com', firstName: 'A', paternalLastName: 'B' }),
    );

    expect(failure).toMatchObject({ status: 409, code: 'user_email_already_registered' });
  });
});

describe('the changes of status', () => {
  const OTHER = 9;

  it.each([
    ['blockUser', ACTIVE, BLOCKED],
    ['unblockUser', BLOCKED, ACTIVE],
    ['deleteUser', ACTIVE, DELETED],
    ['reactivateUser', DELETED, ACTIVE],
  ] as const)('%s takes a user from %i to %i', (operation, from, to) => {
    const model = build({ users: [directoryUser({ id: 1, statusId: from })] });

    expect(model[operation](1).statusId).toBe(to);
    expect(model.findUser(1)?.statusId).toBe(to);
  });

  it.each([
    ['blockUser', BLOCKED, 'user_blocked'],
    ['blockUser', DELETED, 'user_deleted'],
    ['blockUser', OTHER, 'user_not_active'],
    ['unblockUser', ACTIVE, 'user_already_active'],
    ['unblockUser', DELETED, 'user_deleted'],
    ['unblockUser', OTHER, 'user_not_active'],
    ['deleteUser', BLOCKED, 'user_blocked'],
    ['deleteUser', DELETED, 'user_deleted'],
    ['deleteUser', OTHER, 'user_not_active'],
    ['reactivateUser', ACTIVE, 'user_already_active'],
    ['reactivateUser', BLOCKED, 'user_blocked'],
    ['reactivateUser', OTHER, 'user_not_active'],
  ] as const)(
    '%s refuses a user in the status %i with %s and changes nothing',
    (operation, statusId, code) => {
      const model = build({ users: [directoryUser({ id: 1, statusId })] });

      expect(failureOf(() => model[operation](1))).toMatchObject({ status: 409, code });
      expect(model.findUser(1)?.statusId).toBe(statusId);
    },
  );

  it.each(['blockUser', 'unblockUser', 'deleteUser', 'reactivateUser'] as const)(
    '%s refuses a user that does not exist with 404',
    (operation) => {
      expect(failureOf(() => build()[operation](42))).toMatchObject({
        status: 404,
        code: 'user_not_found',
      });
    },
  );

  it('keeps the data, the roles and the email of a deleted user, which can be reactivated', () => {
    const model = build({
      users: [directoryUser({ id: 1, email: 'ana@clinica.com' })],
      roles: [directoryRole({ id: 4, name: 'Marketing' })],
      associations: [{ userId: 1, roleId: 4 }],
    });

    model.deleteUser(1);

    expect(model.findByEmail('ana@clinica.com')?.statusId).toBe(DELETED);
    expect(model.rolesOf(1).map((role) => role.name)).toEqual(['Marketing']);
    expect(model.reactivateUser(1).statusId).toBe(ACTIVE);
    expect(model.listUserRoles(1).map((role) => role.name)).toEqual(['Marketing']);
  });
});

describe('updateUser', () => {
  it('changes the name of an active user and moves its modification date forward', () => {
    const model = build({ users: [directoryUser({ id: 1, firstName: 'Ana' })] });
    const before = model.getUser(1).updatedAt;

    const user = model.updateUser(1, { firstName: ' Anita ', maternalLastName: '' });

    expect(user).toMatchObject({ firstName: 'Anita', maternalLastName: null });
    expect(user.updatedAt > before).toBe(true);
    expect(user.createdAt).toBe(model.getUser(1).createdAt);
  });

  it('keeps what the changes do not mention', () => {
    const model = build({
      users: [directoryUser({ id: 1, firstName: 'Ana', paternalLastName: 'Pérez' })],
    });

    expect(model.updateUser(1, { paternalLastName: 'Gómez' })).toMatchObject({
      firstName: 'Ana',
      paternalLastName: 'Gómez',
    });
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])('refuses a user in the status %i with %s', (statusId, code) => {
    const model = build({ users: [directoryUser({ id: 1, statusId })] });

    expect(failureOf(() => model.updateUser(1, { firstName: 'X' }))).toMatchObject({
      status: 409,
      code,
    });
  });

  it('refuses a user that does not exist with 404', () => {
    expect(failureOf(() => build().updateUser(1, { firstName: 'X' })).status).toBe(404);
  });

  it('lets the last of two changes win: there is no control of concurrency', () => {
    const model = build({ users: [directoryUser({ id: 1, firstName: 'Ana' })] });

    model.updateUser(1, { firstName: 'Beto' });
    model.updateUser(1, { firstName: 'Carla' });

    expect(model.getUser(1).firstName).toBe('Carla');
  });
});

describe('the roles of a user', () => {
  function withRoles(statusId = ACTIVE) {
    return build({
      users: [directoryUser({ id: 1, statusId }), directoryUser({ id: 2 })],
      roles: [
        directoryRole({ id: 6, name: 'Doctor' }),
        directoryRole({ id: 4, name: 'Marketing' }),
        directoryRole({ id: 7, name: 'Support', statusId: BLOCKED }),
        directoryRole({ id: 8, name: 'Billing', statusId: DELETED }),
      ],
      associations: [
        { userId: 1, roleId: 6 },
        { userId: 1, roleId: 4 },
        { userId: 1, roleId: 7 },
      ],
    });
  }

  it('lists the active roles of an active user, sorted by name', () => {
    expect(
      withRoles()
        .listUserRoles(1)
        .map((role) => role.name),
    ).toEqual(['Doctor', 'Marketing']);
  });

  it('lists nothing for a user without roles', () => {
    expect(withRoles().listUserRoles(2)).toEqual([]);
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])('cannot list the roles of a user in the status %i: %s', (statusId, code) => {
    expect(failureOf(() => withRoles(statusId).listUserRoles(1))).toMatchObject({
      status: 409,
      code,
    });
  });

  it('cannot list the roles of a user that does not exist', () => {
    expect(failureOf(() => withRoles().listUserRoles(99))).toMatchObject({
      status: 404,
      code: 'user_not_found',
    });
  });

  describe('associateRole', () => {
    it('gives the role to the user', () => {
      const model = withRoles();

      model.associateRole(2, 4);

      expect(model.listUserRoles(2).map((role) => role.name)).toEqual(['Marketing']);
    });

    it('checks the user first: it must exist and be active', () => {
      expect(failureOf(() => withRoles().associateRole(99, 4))).toMatchObject({
        status: 404,
        code: 'user_not_found',
      });
      expect(failureOf(() => withRoles(BLOCKED).associateRole(1, 4))).toMatchObject({
        status: 409,
        code: 'user_blocked',
      });
    });

    it.each([
      ['does not exist', 99],
      ['is blocked', 7],
      ['is deleted', 8],
    ])('refuses a role that %s with 404 role_not_found', (_label, roleId) => {
      expect(failureOf(() => withRoles().associateRole(2, roleId))).toMatchObject({
        status: 404,
        code: 'role_not_found',
      });
    });

    it('refuses a role the user already has with 409', () => {
      expect(failureOf(() => withRoles().associateRole(1, 4))).toMatchObject({
        status: 409,
        code: 'user_role_already_associated',
      });
    });
  });

  describe('disassociateRole', () => {
    it('takes the role away from the user and from nobody else', () => {
      const model = withRoles();
      model.associateRole(2, 4);

      model.disassociateRole(1, 4);

      expect(model.listUserRoles(1).map((role) => role.name)).toEqual(['Doctor']);
      expect(model.listUserRoles(2).map((role) => role.name)).toEqual(['Marketing']);
    });

    it('checks the user, then the role, then that the user has it', () => {
      const disassociate = (model: ReturnType<typeof withRoles>, userId: number, roleId: number) =>
        failureOf(() => {
          model.disassociateRole(userId, roleId);
        });

      expect(disassociate(withRoles(), 99, 4).code).toBe('user_not_found');
      expect(disassociate(withRoles(DELETED), 1, 4).code).toBe('user_deleted');
      expect(disassociate(withRoles(), 1, 99)).toMatchObject({
        status: 404,
        code: 'role_not_found',
      });
      expect(disassociate(withRoles(), 2, 4)).toMatchObject({
        status: 409,
        code: 'user_role_not_associated',
      });
    });
  });
});

describe('the catalog of roles', () => {
  it('lists the active roles sorted by name, without the blocked or deleted ones', () => {
    const model = build({
      roles: [
        directoryRole({ id: 6, name: 'Doctor' }),
        directoryRole({ id: 1, name: 'Administrator' }),
        directoryRole({ id: 7, name: 'Support', statusId: BLOCKED }),
        directoryRole({ id: 8, name: 'Billing', statusId: DELETED }),
      ],
    });

    expect(model.listActiveRoles().map((role) => role.name)).toEqual(['Administrator', 'Doctor']);
  });
});

describe('the helpers to prepare data', () => {
  it('adds users and roles with the next id and a different email', () => {
    const model = build();

    const first = model.addUser();
    const second = model.addUser({ firstName: 'Beto' });
    const role = model.addRole({ name: 'Auditor' });

    expect([first.id, second.id]).toEqual([1, 2]);
    expect(first.email).not.toBe(second.email);
    expect(second.firstName).toBe('Beto');
    expect(role.id).toBe(1);
  });

  it('changes the status of a user or a role without applying the rules', () => {
    const model = build({
      users: [directoryUser({ id: 1 })],
      roles: [directoryRole({ id: 4, name: 'Marketing' })],
    });

    model.setUserStatus(1, DELETED);
    model.setRoleStatus(4, BLOCKED);

    expect(model.findUser(1)?.statusId).toBe(DELETED);
    expect(model.findRole(4)?.statusId).toBe(BLOCKED);
  });

  it('grants and revokes the permission of a role by its name', () => {
    const model = build({
      users: [directoryUser({ id: 1, auth0Id: 'auth0|ana' })],
      roles: [directoryRole({ id: 4, name: 'Marketing', permissions: [] })],
      associations: [{ userId: 1, roleId: 4 }],
    });

    model.grant('Marketing', 'users:read');
    model.grant('Marketing', 'users:read');
    expect([...model.permissionsOf('auth0|ana')]).toEqual(['users:read']);

    model.revoke('Marketing', 'users:read');
    expect(model.permissionsOf('auth0|ana').size).toBe(0);
  });
});
