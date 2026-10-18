import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { USERS_API_BASE_URL } from '../usersService';
import { directoryRole, directoryUser } from './model';
import { ADMIN_SUB, createUsersDirectoryMock, defaultDirectory, makeUsers } from './index';

const ME = `${USERS_API_BASE_URL}/api/v1/authorization/me`;

/** Asks the simulator as the service is asked: with the token the tests give, `test-token:<sub>`. */
function askAs(sub: string | null, init: RequestInit = {}): Promise<Response> {
  return fetch(ME, {
    ...init,
    headers: sub === null ? {} : { Authorization: `Bearer test-token:${sub}` },
  });
}

function mockWithAna() {
  return createUsersDirectoryMock({
    users: [directoryUser({ id: 2, auth0Id: 'auth0|ana', firstName: 'Ana' })],
    roles: [
      directoryRole({ id: 6, name: 'Doctor', permissions: ['tenants:read'] }),
      directoryRole({ id: 4, name: 'Marketing', permissions: ['tenants:update', 'tenants:read'] }),
      directoryRole({ id: 7, name: 'Support', statusId: 2, permissions: ['x:read'] }),
    ],
    associations: [
      { userId: 2, roleId: 6 },
      { userId: 2, roleId: 4 },
      { userId: 2, roleId: 7 },
    ],
  });
}

describe('the simulator of the users service: me', () => {
  it('answers by the sub of the token with the rules of the service', async () => {
    mockWithAna();

    const response = await askAs('auth0|ana');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      user: { id: 2, auth0_id: 'auth0|ana', first_name: 'Ana', status: { id: 1, name: 'Activo' } },
      roles: [
        { id: 6, name: 'Doctor', permissions: ['tenants:read'] },
        { id: 4, name: 'Marketing', permissions: ['tenants:read', 'tenants:update'] },
      ],
    });
  });

  it('has no user and no roles for someone who is not registered', async () => {
    mockWithAna();

    expect(await (await askAs('auth0|nobody')).json()).toEqual({ user: null, roles: [] });
  });

  it('has the user but no roles when it is not active', async () => {
    const mock = mockWithAna();
    mock.setUserStatus(2, 2);

    const body: unknown = await (await askAs('auth0|ana')).json();

    expect(body).toMatchObject({ user: { status: { id: 2 } }, roles: [] });
  });

  it('follows the changes of the data: a permission that is revoked disappears from the answer', async () => {
    const mock = mockWithAna();
    mock.revoke('Marketing', 'tenants:update');

    const body: unknown = await (await askAs('auth0|ana')).json();

    expect(body).toMatchObject({
      roles: [{}, { name: 'Marketing', permissions: ['tenants:read'] }],
    });
  });

  it('asks for no permission, only for who is asking', async () => {
    mockWithAna();

    expect((await askAs('auth0|ana')).status).toBe(200);
    expect((await askAs('auth0|nobody')).status).toBe(200);
  });

  it('answers 401 unauthenticated without the header', async () => {
    mockWithAna();

    const response = await askAs(null);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('answers 401 invalid_token to a token that is not the one of the tests', async () => {
    mockWithAna();

    const response = await fetch(ME, {
      headers: { Authorization: 'Bearer eyJhbGciOi.other.token' },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'invalid_token' });
  });

  describe('the failures that a test can inject', () => {
    it('fails only the next request with failNext, and then recovers by itself', async () => {
      const mock = mockWithAna();
      mock.failNext({
        method: 'GET',
        path: '/api/v1/authorization/me',
        status: 503,
        code: 'authentication_unavailable',
      });

      const first = await askAs('auth0|ana');
      const second = await askAs('auth0|ana');

      expect(first.status).toBe(503);
      expect(await first.json()).toMatchObject({ code: 'authentication_unavailable' });
      expect(second.status).toBe(200);
    });

    it('lets some requests through before failing with `after`', async () => {
      const mock = mockWithAna();
      mock.failNext({ status: 500, code: 'internal_error', after: 1 });

      expect([(await askAs('auth0|ana')).status, (await askAs('auth0|ana')).status]).toEqual([
        200, 500,
      ]);
    });

    it('does not fail a request that the rule does not describe', async () => {
      const mock = mockWithAna();
      mock.failNext({ method: 'POST', status: 500, code: 'internal_error' });

      expect((await askAs('auth0|ana')).status).toBe(200);
    });

    it('fails every request with failAll until it recovers', async () => {
      const mock = mockWithAna();
      mock.failAll(500);

      expect((await askAs('auth0|ana')).status).toBe(500);
      expect((await askAs('auth0|ana')).status).toBe(500);
      mock.recover();
      expect((await askAs('auth0|ana')).status).toBe(200);
    });

    it('receives the requests but never answers them with hang, and notices when they are cancelled', async () => {
      const mock = mockWithAna();
      mock.hang();

      await expect(askAs('auth0|ana', { signal: AbortSignal.timeout(100) })).rejects.toThrow();

      await waitFor(() => {
        expect(mock.abortedCount).toBe(1);
      });
      expect(mock.requestCount).toBe(1);
    });

    it('holds the answer with defer until the test lets it go', async () => {
      const mock = mockWithAna();
      const release = mock.defer();

      const pending = askAs('auth0|ana');
      await waitFor(() => {
        expect(mock.requestCount).toBe(1);
      });
      release();

      expect((await pending).status).toBe(200);
    });
  });

  describe('the record of the requests', () => {
    it('keeps the method, the path, the search, the body and the authorization of each one', async () => {
      const mock = mockWithAna();

      await fetch(`${ME}?x=1`, {
        method: 'GET',
        headers: { Authorization: 'Bearer test-token:auth0|ana' },
      });

      expect(mock.requests).toEqual([
        {
          method: 'GET',
          path: '/api/v1/authorization/me',
          search: '?x=1',
          body: null,
          authorization: 'Bearer test-token:auth0|ana',
          aborted: false,
        },
      ]);
      expect(mock.requestCount).toBe(1);
    });

    it('finds the requests made to a path with requestsTo', async () => {
      const mock = mockWithAna();
      await askAs('auth0|ana');
      await askAs('auth0|ana');

      expect(mock.requestsTo('get', '/api/v1/authorization/me')).toHaveLength(2);
      expect(mock.requestsTo('POST', '/api/v1/authorization/me')).toHaveLength(0);
      expect(mock.requestsTo('GET', /authorization/)).toHaveLength(2);
    });
  });

  describe('the default directory', () => {
    it('has an administrator who can do everything with the users and read the roles', async () => {
      const mock = createUsersDirectoryMock();

      const response = await askAs(ADMIN_SUB);
      const { roles } = mock.state.accessOf(ADMIN_SUB);

      expect(response.status).toBe(200);
      expect(roles.map((role) => role.name)).toEqual(['Administrator']);
      expect(roles[0]?.permissions).toEqual(
        expect.arrayContaining([
          'users:read',
          'users:write',
          'users:update',
          'users:delete',
          'roles:read',
        ]),
      );
    });

    it('offers the roles of the platform and creates as many active users as asked', () => {
      const directory = defaultDirectory();

      expect(directory.roles.map((role) => role.name)).toEqual(
        expect.arrayContaining([
          'Administrator',
          'Developer',
          'Marketing',
          'Billing',
          'Owner',
          'Doctor',
          'Support',
        ]),
      );
      const users = makeUsers(30);
      expect(users).toHaveLength(30);
      expect(users[0]).toMatchObject({ firstName: 'Usuario', paternalLastName: 'Prueba 01' });
      expect(new Set(users.map((user) => user.email)).size).toBe(30);
    });
  });
});
