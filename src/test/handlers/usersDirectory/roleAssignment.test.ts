import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock, defaultDirectory, directoryRole, directoryUser } from './index';
import { uuidOf } from '@/test/ids';

const BLOCKED = 2;
const DELETED = 3;

function start(userStatusId = 1) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    users: [...base.users, directoryUser({ id: uuidOf(121), statusId: userStatusId })],
    roles: [
      ...base.roles,
      directoryRole({ id: 8, name: 'Auditor' }),
      directoryRole({ id: 9, name: 'Zeta', statusId: BLOCKED }),
      directoryRole({ id: 10, name: 'Eta', statusId: DELETED }),
    ],
    associations: base.associations,
  });
}

const assign = (path: string, body: unknown, sub?: string) =>
  callService(path, { method: 'POST', body, ...(sub === undefined ? {} : { sub }) });

describe('GET /api/v1/roles', () => {
  it('gives every active role sorted by name, with no pagination', async () => {
    start();

    const answer = await callService('/api/v1/roles');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject([
      { name: 'Administrator' },
      { name: 'Auditor' },
      { name: 'Billing' },
      { name: 'Developer' },
      { name: 'Doctor' },
      { name: 'Marketing' },
      { name: 'Owner' },
      { name: 'Support' },
    ]);
  });

  it('asks for roles:read', async () => {
    const mock = start();
    mock.revoke('Administrator', 'roles:read');

    const answer = await callService('/api/v1/roles');

    expect(answer.status).toBe(403);
    expect(answer.body).toMatchObject({ code: 'permission_denied' });
  });
});

describe('POST /api/v1/users/{id}/roles', () => {
  it('gives the role to the user and answers 201 with the assignment', async () => {
    const mock = start();

    const answer = await assign(`/api/v1/users/${uuidOf(121)}/roles`, { role_id: 4 });

    expect(answer.status).toBe(201);
    expect(answer.body).toEqual({ user_id: uuidOf(121), role: { id: 4, name: 'Marketing' } });
    expect(mock.state.rolesOf(uuidOf(121)).map((role) => role.name)).toEqual(['Marketing']);
  });

  it('checks the user first: it must exist and be active', async () => {
    start();

    expect((await assign(`/api/v1/users/${uuidOf(999)}/roles`, { role_id: 4 })).body).toMatchObject(
      {
        code: 'user_not_found',
      },
    );
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])(
    'answers 409 for a user in the status %i with the code %s, even if the role does not exist',
    async (statusId, code) => {
      start(statusId);

      const answer = await assign(`/api/v1/users/${uuidOf(121)}/roles`, { role_id: 999 });

      expect(answer.status).toBe(409);
      expect(answer.body).toMatchObject({ code });
    },
  );

  it.each([
    ['does not exist', 999],
    ['is blocked', 9],
    ['is deleted', 10],
  ])('answers 404 role_not_found for a role that %s', async (_label, roleId) => {
    start();

    const answer = await assign(`/api/v1/users/${uuidOf(121)}/roles`, { role_id: roleId });

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'role_not_found' });
  });

  it('refuses a role the user already has with 409 user_role_already_associated', async () => {
    start();
    await assign(`/api/v1/users/${uuidOf(121)}/roles`, { role_id: 4 });

    const answer = await assign(`/api/v1/users/${uuidOf(121)}/roles`, { role_id: 4 });

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_role_already_associated' });
  });

  it.each([
    ['no body', undefined],
    ['no role_id', {}],
    ['a role_id that is a text', { role_id: '4' }],
    ['a role_id of 0', { role_id: 0 }],
    ['a negative role_id', { role_id: -1 }],
    ['a role_id that is not whole', { role_id: 1.5 }],
  ])('answers 422 naming role_id for %s', async (_label, body) => {
    start();

    const answer = await assign(`/api/v1/users/${uuidOf(121)}/roles`, body);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({
      code: 'validation_error',
      errors: [{ field: 'role_id' }],
    });
  });

  it('answers 422 naming user_id when the id of the user is not a whole number', async () => {
    start();

    const answer = await assign('/api/v1/users/abc/roles', { role_id: 4 });

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ errors: [{ field: 'user_id' }] });
  });

  it('asks for users:update before validating', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');

    const answer = await assign('/api/v1/users/abc/roles', {});

    expect(answer.status).toBe(403);
  });
});
