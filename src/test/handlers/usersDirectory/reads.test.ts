import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import {
  createUsersDirectoryMock,
  defaultDirectory,
  directoryRole,
  directoryUser,
  makeUsers,
  type DirectoryUser,
} from './index';
import { uuidOf } from '@/test/ids';

const BLOCKED = 2;
const DELETED = 3;

/** The default platform plus more users, such as the validation guide prepares them. */
function startWith(extra: readonly DirectoryUser[] = [], withRoles = false) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    users: [...base.users, ...extra],
    roles: withRoles
      ? [
          ...base.roles,
          directoryRole({ id: 8, name: 'Auditor' }),
          directoryRole({ id: 9, name: 'Zeta', statusId: BLOCKED }),
        ]
      : base.roles,
    associations: base.associations,
  });
}

function idsOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'items' in body && Array.isArray(body.items)
    ? body.items.map((item: unknown) =>
        typeof item === 'object' && item !== null && 'id' in item ? item.id : undefined,
      )
    : undefined;
}

describe('GET /api/v1/users', () => {
  it('lists only the active users, in the order of the service, with their total and pages', async () => {
    startWith([
      directoryUser({ id: uuidOf(2), firstName: 'Beto', paternalLastName: 'Ruiz' }),
      directoryUser({ id: uuidOf(3), firstName: 'Ana', paternalLastName: 'Pérez' }),
      directoryUser({
        id: uuidOf(4),
        firstName: 'Aaron',
        paternalLastName: 'Cruz',
        statusId: BLOCKED,
      }),
      directoryUser({
        id: uuidOf(5),
        firstName: 'Carla',
        paternalLastName: 'Díaz',
        statusId: DELETED,
      }),
    ]);

    const answer = await callService('/api/v1/users?page=1&page_size=10');

    expect(answer.status).toBe(200);
    // Admin Sistema, Ana Pérez, Beto Ruiz: the blocked and the deleted ones are not listed or counted.
    expect(idsOf(answer.body)).toEqual([1, 3, 2].map(uuidOf));
    expect(answer.body).toMatchObject({ total: 3, page: 1, page_size: 10, pages: 1 });
  });

  it('answers a page of 50 users, the first one, when the request does not say', async () => {
    startWith(makeUsers(60));

    const answer = await callService('/api/v1/users');

    expect(answer.body).toMatchObject({ total: 61, page: 1, page_size: 50, pages: 2 });
    expect(idsOf(answer.body)).toHaveLength(50);
  });

  it('answers a page past the last one with no items, not with an error', async () => {
    startWith(makeUsers(5));

    const answer = await callService('/api/v1/users?page=9&page_size=10');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ items: [], total: 6, page: 9, pages: 1 });
  });

  it.each([
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['page=1.5', 'page'],
    ['page_size=101', 'page_size'],
    ['page_size=0', 'page_size'],
    ['page_size=abc', 'page_size'],
  ])('rejects %s with a 422 that names the field %s', async (query, field) => {
    startWith();

    const answer = await callService(`/api/v1/users?${query}`);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({
      code: 'validation_error',
      errors: [{ field }],
    });
  });

  it('accepts the limits of the page size: 1 and 100', async () => {
    startWith();

    expect((await callService('/api/v1/users?page_size=1')).status).toBe(200);
    expect((await callService('/api/v1/users?page_size=100')).status).toBe(200);
  });
});

describe('GET /api/v1/users/by-email', () => {
  function startWithOthers() {
    return startWith([
      directoryUser({ id: uuidOf(2), email: 'ana@clinica.com' }),
      directoryUser({ id: uuidOf(3), email: 'beto@clinica.com', statusId: BLOCKED }),
      directoryUser({ id: uuidOf(4), email: 'carla@clinica.com', statusId: DELETED }),
    ]);
  }

  it('ignores the case and the spaces around the email', async () => {
    startWithOthers();

    const answer = await callService('/api/v1/users/by-email?email=%20ANA%40Clinica.com%20');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: uuidOf(2), email: 'ana@clinica.com' });
  });

  it('finds the users that are blocked or deleted, with their status', async () => {
    startWithOthers();

    expect(
      (await callService('/api/v1/users/by-email?email=beto%40clinica.com')).body,
    ).toMatchObject({
      status: { id: BLOCKED, name: 'Bloqueado' },
    });
    expect(
      (await callService('/api/v1/users/by-email?email=carla%40clinica.com')).body,
    ).toMatchObject({
      status: { id: DELETED, name: 'Eliminado' },
    });
  });

  it('answers 404 user_not_found when there is nobody with that email', async () => {
    startWithOthers();

    const answer = await callService('/api/v1/users/by-email?email=nadie%40clinica.com');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each(['', '?email=', '?email=no-es-correo', '?email=ana%40'])(
    'rejects "%s" with a 422 on the field email',
    async (query) => {
      startWithOthers();

      const answer = await callService(`/api/v1/users/by-email${query}`);

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({ code: 'validation_error', errors: [{ field: 'email' }] });
    },
  );
});

describe('GET /api/v1/users/{id}', () => {
  it('gives a user of any status', async () => {
    startWith([
      directoryUser({ id: uuidOf(2) }),
      directoryUser({ id: uuidOf(3), statusId: BLOCKED }),
      directoryUser({ id: uuidOf(4), statusId: DELETED }),
    ]);

    expect((await callService(`/api/v1/users/${uuidOf(2)}`)).body).toMatchObject({
      id: uuidOf(2),
      status: { id: 1 },
    });
    expect((await callService(`/api/v1/users/${uuidOf(3)}`)).body).toMatchObject({
      id: uuidOf(3),
      status: { id: 2 },
    });
    expect((await callService(`/api/v1/users/${uuidOf(4)}`)).body).toMatchObject({
      id: uuidOf(4),
      status: { id: 3 },
    });
  });

  it('answers 404 user_not_found for an id that does not exist', async () => {
    startWith();

    const answer = await callService(`/api/v1/users/${uuidOf(999)}`);

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each(['abc', '0', '-1', '1.5'])(
    'rejects the id "%s" with a 422 on the field user_id',
    async (id) => {
      startWith();

      const answer = await callService(`/api/v1/users/${id}`);

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({
        code: 'validation_error',
        errors: [{ field: 'user_id' }],
      });
    },
  );
});

describe('GET /api/v1/users/{id}/roles', () => {
  it('gives the active roles of an active user, sorted by name', async () => {
    const mock = startWith([directoryUser({ id: uuidOf(2) })], true);
    mock.assign(uuidOf(2), 8);
    mock.assign(uuidOf(2), 4);
    mock.assign(uuidOf(2), 9);

    const answer = await callService(`/api/v1/users/${uuidOf(2)}/roles`);

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject([{ name: 'Auditor' }, { name: 'Marketing' }]);
  });

  it('gives an empty list for a user without roles', async () => {
    startWith([directoryUser({ id: uuidOf(2) })]);

    expect((await callService(`/api/v1/users/${uuidOf(2)}/roles`)).body).toEqual([]);
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])('answers 409 for a user in the status %i: %s', async (statusId, code) => {
    startWith([directoryUser({ id: uuidOf(2), statusId })]);

    const answer = await callService(`/api/v1/users/${uuidOf(2)}/roles`);

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
  });

  it('answers 404 for a user that does not exist', async () => {
    startWith();

    expect((await callService(`/api/v1/users/${uuidOf(999)}/roles`)).body).toMatchObject({
      code: 'user_not_found',
    });
  });
});

describe('the permission to read (users:read)', () => {
  it.each([
    '/api/v1/users',
    '/api/v1/users?page=0',
    '/api/v1/users/by-email?email=no-es-correo',
    `/api/v1/users/${uuidOf(999)}`,
    '/api/v1/users/abc',
    `/api/v1/users/${uuidOf(999)}/roles`,
  ])('is asked for before validating or searching: %s answers 403', async (path) => {
    startWith();

    const answer = await callService(path, { sub: 'auth0|nobody' });

    expect(answer.status).toBe(403);
    expect(answer.body).toMatchObject({ code: 'permission_denied' });
  });

  it('is taken from the data: without users:read the administrator is refused too', async () => {
    const mock = startWith();
    mock.revoke('Administrator', 'users:read');

    expect((await callService('/api/v1/users')).status).toBe(403);
  });
});
