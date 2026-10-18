import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock, defaultDirectory, directoryUser } from './index';

const BLOCKED = 2;
const DELETED = 3;

function start(userStatusId = 1) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: 121, statusId: userStatusId })],
  });
  mock.assign(121, 4);
  mock.assign(121, 6);
  return mock;
}

const remove = (path: string, sub?: string) =>
  callService(path, { method: 'DELETE', ...(sub === undefined ? {} : { sub }) });

describe('DELETE /api/v1/users/{id}/roles/{roleId}', () => {
  it('takes the role away with a 204 and leaves the other roles of the user', async () => {
    const mock = start();

    const answer = await remove('/api/v1/users/121/roles/4');

    expect(answer.status).toBe(204);
    expect(answer.body).toBeNull();
    expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual(['Doctor']);
  });

  it('checks the user first: it must exist and be active', async () => {
    start();

    expect((await remove('/api/v1/users/999/roles/4')).body).toMatchObject({
      code: 'user_not_found',
    });
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])(
    'answers 409 %s for a user in the status %i, even for a role that does not exist',
    async (statusId, code) => {
      start(statusId);

      const answer = await remove('/api/v1/users/121/roles/999');

      expect(answer.status).toBe(409);
      expect(answer.body).toMatchObject({ code });
    },
  );

  it('answers 404 role_not_found for a role that does not exist', async () => {
    start();

    const answer = await remove('/api/v1/users/121/roles/999');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'role_not_found' });
  });

  it('answers 409 user_role_not_associated for a role the user does not have', async () => {
    start();

    const answer = await remove('/api/v1/users/121/roles/5');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_role_not_associated' });
  });

  it('answers 409 when the same role is taken away twice', async () => {
    start();
    await remove('/api/v1/users/121/roles/4');

    const second = await remove('/api/v1/users/121/roles/4');

    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: 'user_role_not_associated' });
  });

  it.each(['abc', '0', '-1', '1.5'])(
    'answers 422 naming role_id for the role "%s"',
    async (roleId) => {
      start();

      const answer = await remove(`/api/v1/users/121/roles/${roleId}`);

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({ errors: [{ field: 'role_id' }] });
    },
  );

  it('asks for users:update', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');

    expect((await remove('/api/v1/users/121/roles/4')).status).toBe(403);
  });
});
