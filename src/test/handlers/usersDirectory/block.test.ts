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
    users: [...base.users, directoryUser({ id: 121, statusId })],
  });
}

const post = (path: string) => callService(path, { method: 'POST' });

describe('POST /api/v1/users/{id}/block', () => {
  it('blocks an active user and answers with it, with a later update date', async () => {
    const mock = start();
    const before = mock.state.findUser(121)?.updatedAt;

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: 121, status: { id: BLOCKED } });
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
    expect(mock.state.findUser(121)?.updatedAt).not.toBe(before);
  });

  it('leaves the roles of the user as they are', async () => {
    const mock = start();
    mock.assign(121, 4);

    await post('/api/v1/users/121/block');

    expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual(['Marketing']);
  });

  it('answers 404 user_not_found for a user that does not exist', async () => {
    start();

    const answer = await post('/api/v1/users/999/block');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each([
    [BLOCKED, 'user_blocked'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])('answers 409 for a user in the status %i, and changes nothing', async (statusId, code) => {
    const mock = start(statusId);

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
    expect(mock.state.findUser(121)?.statusId).toBe(statusId);
  });

  it('answers 409 when it is blocked twice', async () => {
    start();
    await post('/api/v1/users/121/block');

    const second = await post('/api/v1/users/121/block');

    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: 'user_blocked' });
  });

  it('blocks the user even when it has no access account, which is no obstacle', async () => {
    const mock = start();
    mock.identity.accountMissing(121);

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(200);
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
  });

  it('answers 503 identity_provider_unavailable when the provider does not answer, and does not block', async () => {
    const mock = start();
    mock.identity.unavailable();

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(503);
    expect(answer.body).toMatchObject({ code: 'identity_provider_unavailable' });
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it('answers 502 identity_provider_error when the provider refuses, and does not block', async () => {
    const mock = start();
    mock.identity.rejected();

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(502);
    expect(answer.body).toMatchObject({ code: 'identity_provider_error' });
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it('blocks once the provider is back', async () => {
    const mock = start();
    mock.identity.unavailable();
    await post('/api/v1/users/121/block');
    mock.identity.recover();

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(200);
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
  });

  it('checks the rules of business before calling the provider', async () => {
    const mock = start(BLOCKED);
    mock.identity.unavailable();

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_blocked' });
  });

  it('asks for users:update', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');

    const answer = await post('/api/v1/users/121/block');

    expect(answer.status).toBe(403);
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it.each(['abc', '0', '-1', '1.5'])('answers 422 naming user_id for "%s"', async (userId) => {
    start();

    const answer = await post(`/api/v1/users/${userId}/block`);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ errors: [{ field: 'user_id' }] });
  });
});

describe('POST /api/v1/users/{id}/unblock', () => {
  it('unblocks a blocked user and answers with it', async () => {
    const mock = start(BLOCKED);

    const answer = await post('/api/v1/users/121/unblock');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: 121, status: { id: ACTIVE } });
    expect(mock.state.findUser(121)?.statusId).toBe(ACTIVE);
  });

  it('answers 404 user_not_found for a user that does not exist', async () => {
    start();

    const answer = await post('/api/v1/users/999/unblock');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it.each([
    [ACTIVE, 'user_already_active'],
    [DELETED, 'user_deleted'],
    [9, 'user_not_active'],
  ])('answers 409 for a user in the status %i, and changes nothing', async (statusId, code) => {
    const mock = start(statusId);

    const answer = await post('/api/v1/users/121/unblock');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
    expect(mock.state.findUser(121)?.statusId).toBe(statusId);
  });

  it('answers 409 auth0_account_not_found when the person has no access account, and keeps it blocked', async () => {
    const mock = start(BLOCKED);
    mock.identity.accountMissing(121);

    const answer = await post('/api/v1/users/121/unblock');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'auth0_account_not_found' });
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
  });

  it.each([
    ['unavailable', 503, 'identity_provider_unavailable'],
    ['rejected', 502, 'identity_provider_error'],
  ] as const)(
    'answers %s from the provider as %i %s, and keeps it blocked',
    async (failure, status, code) => {
      const mock = start(BLOCKED);
      mock.identity[failure]();

      const answer = await post('/api/v1/users/121/unblock');

      expect(answer.status).toBe(status);
      expect(answer.body).toMatchObject({ code });
      expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
    },
  );

  it('checks the rules of business before calling the provider', async () => {
    const mock = start(ACTIVE);
    mock.identity.unavailable();

    const answer = await post('/api/v1/users/121/unblock');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_already_active' });
  });

  it('asks for users:update', async () => {
    const mock = start(BLOCKED);
    mock.revoke('Administrator', 'users:update');

    const answer = await post('/api/v1/users/121/unblock');

    expect(answer.status).toBe(403);
    expect(mock.state.findUser(121)?.statusId).toBe(BLOCKED);
  });

  it('gives the person back the access of the roles they had', async () => {
    const mock = start();
    mock.assign(121, 1);
    await post('/api/v1/users/121/block');
    expect(mock.state.permissionsOf('auth0|sim-121').size).toBe(0);

    await post('/api/v1/users/121/unblock');

    expect(mock.state.permissionsOf('auth0|sim-121').has('users:read')).toBe(true);
  });
});
