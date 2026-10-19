import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock, defaultDirectory, directoryUser } from './index';

const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

function start(statusId = ACTIVE) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: 121, statusId, email: 'ana@clinica.com' })],
  });
}

const remove = (path: string) => callService(path, { method: 'DELETE' });
const post = (path: string) => callService(path, { method: 'POST' });

describe('DELETE /api/v1/users/{id}', () => {
  it('deletes an active user with a 204, and keeps its data and its roles', async () => {
    const mock = start();
    mock.assign(121, 4);
    const before = mock.state.findUser(121);

    const answer = await remove('/api/v1/users/121');

    expect(answer.status).toBe(204);
    expect(answer.body).toBeNull();
    expect(mock.state.findUser(121)).toMatchObject({
      statusId: DELETED,
      email: before?.email,
      firstName: before?.firstName,
      paternalLastName: before?.paternalLastName,
    });
    expect(mock.state.findUser(121)?.updatedAt).not.toBe(before?.updatedAt);
    expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual(['Marketing']);
  });

  it('takes the user out of the list but still finds it by email, as deleted', async () => {
    start();
    await remove('/api/v1/users/121');

    const list = await callService('/api/v1/users?page=1&page_size=10');
    const found = await callService('/api/v1/users/by-email?email=ana%40clinica.com');

    expect(list.body).toMatchObject({ total: 1 });
    expect(found.body).toMatchObject({ id: 121, status: { id: DELETED } });
  });

  it('keeps the email reserved: a user with it cannot be created while it is deleted', async () => {
    start();
    await remove('/api/v1/users/121');

    const answer = await callService('/api/v1/users', {
      method: 'POST',
      body: {
        email: 'ana@clinica.com',
        password: 'Segura-123',
        first_name: 'Otra',
        paternal_last_name: 'Persona',
      },
    });

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_email_already_registered' });
  });

  it('answers 404 user_not_found for a user that does not exist', async () => {
    start();

    const answer = await remove('/api/v1/users/999');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each([
    [DELETED, 'user_deleted'],
    // A blocked user has to be unblocked before it can be deleted.
    [BLOCKED, 'user_blocked'],
    [9, 'user_not_active'],
  ])('answers 409 for a user in the status %i, and changes nothing', async (statusId, code) => {
    const mock = start(statusId);

    const answer = await remove('/api/v1/users/121');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
    expect(mock.state.findUser(121)?.statusId).toBe(statusId);
  });

  it('deletes the user even when it has no access account, which is no obstacle', async () => {
    const mock = start();
    mock.identity.accountMissing(121);

    const answer = await remove('/api/v1/users/121');

    expect(answer.status).toBe(204);
    expect(mock.state.findUser(121)?.statusId).toBe(DELETED);
  });

  it.each([
    ['unavailable', 503, 'identity_provider_unavailable'],
    ['rejected', 502, 'identity_provider_error'],
  ] as const)(
    'answers %s from the provider as %i %s, and does not delete',
    async (failure, status, code) => {
      const mock = start();
      mock.identity[failure]();

      const answer = await remove('/api/v1/users/121');

      expect(answer.status).toBe(status);
      expect(answer.body).toMatchObject({ code });
      expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
    },
  );

  it('checks the rules of business before calling the provider', async () => {
    const mock = start(DELETED);
    mock.identity.unavailable();

    const answer = await remove('/api/v1/users/121');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_deleted' });
  });

  it('asks for users:delete, and not only for users:update', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:delete');

    const answer = await remove('/api/v1/users/121');

    expect(answer.status).toBe(403);
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it.each(['abc', '0', '-1'])('answers 422 naming user_id for "%s"', async (userId) => {
    start();

    const answer = await remove(`/api/v1/users/${userId}`);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ errors: [{ field: 'user_id' }] });
  });
});

describe('POST /api/v1/users/{id}/reactivate', () => {
  it('reactivates a deleted user, who recovers the active roles it had', async () => {
    const mock = start();
    mock.assign(121, 4);
    mock.assign(121, 6);
    mock.setRoleStatus(6, 2);
    await remove('/api/v1/users/121');

    const answer = await post('/api/v1/users/121/reactivate');
    const roles = await callService('/api/v1/users/121/roles');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: 121, status: { id: ACTIVE } });
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
    // The role that was blocked in the meantime is not given back.
    expect(roles.body).toMatchObject([{ name: 'Marketing' }]);
  });

  it('answers 404 user_not_found for a user that does not exist', async () => {
    start();

    const answer = await post('/api/v1/users/999/reactivate');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each([
    [ACTIVE, 'user_already_active'],
    [BLOCKED, 'user_blocked'],
    [9, 'user_not_active'],
  ])('answers 409 for a user in the status %i, and changes nothing', async (statusId, code) => {
    const mock = start(statusId);

    const answer = await post('/api/v1/users/121/reactivate');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
    expect(mock.state.findUser(121)?.statusId).toBe(statusId);
  });

  it('answers 409 auth0_account_not_found when the person has no access account, and keeps it deleted', async () => {
    const mock = start(DELETED);
    mock.identity.accountMissing(121);

    const answer = await post('/api/v1/users/121/reactivate');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'auth0_account_not_found' });
    expect(mock.state.findUser(121)?.statusId).toBe(DELETED);
  });

  it.each([
    ['unavailable', 503, 'identity_provider_unavailable'],
    ['rejected', 502, 'identity_provider_error'],
  ] as const)(
    'answers %s from the provider as %i %s, and keeps it deleted',
    async (failure, status, code) => {
      const mock = start(DELETED);
      mock.identity[failure]();

      const answer = await post('/api/v1/users/121/reactivate');

      expect(answer.status).toBe(status);
      expect(answer.body).toMatchObject({ code });
      expect(mock.state.findUser(121)?.statusId).toBe(DELETED);
    },
  );

  it('asks for users:update', async () => {
    const mock = start(DELETED);
    mock.revoke('Administrator', 'users:update');

    const answer = await post('/api/v1/users/121/reactivate');

    expect(answer.status).toBe(403);
    expect(mock.state.findUser(121)?.statusId).toBe(DELETED);
  });
});
