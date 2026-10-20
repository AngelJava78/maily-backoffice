import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { userDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { blockUser, unblockUser } from './usersApi';
import { uuidOf } from '@/test/ids';

const BLOCK_URL = usersUrl(`/api/v1/users/${uuidOf(121)}/block`);
const UNBLOCK_URL = usersUrl(`/api/v1/users/${uuidOf(121)}/unblock`);

/** What the service answers when a user is blocked or unblocked: the user with its new status. */
const BLOCKED = userDto({ status: { id: 2, name: 'Bloqueado' } });
const ACTIVE = userDto({ status: { id: 1, name: 'Activo' } });

describe('blockUser', () => {
  it('posts to the block address, without a body, and gives the user as it is now', async () => {
    const seen: { method: string; hasBody: boolean; authorization: string | null }[] = [];
    server.use(
      http.post(BLOCK_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          hasBody: (await request.text()) !== '',
          authorization: request.headers.get('authorization'),
        });
        return HttpResponse.json(BLOCKED);
      }),
    );
    const { client, authorization } = createUsersClient();

    const user = await blockUser(client, uuidOf(121));

    expect(seen).toEqual([{ method: 'POST', hasBody: false, authorization }]);
    expect(user).toMatchObject({ id: uuidOf(121), status: { id: 2, name: 'Bloqueado' } });
  });

  it.each([
    [404, 'user_not_found'],
    [409, 'user_blocked'],
    [409, 'user_deleted'],
    [502, 'identity_provider_error'],
    [503, 'identity_provider_unavailable'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.post(BLOCK_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await blockUser(client, uuidOf(121)).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('refuses an answer that is not a user', async () => {
    server.use(http.post(BLOCK_URL, () => HttpResponse.json({ ok: true })));
    const { client } = createUsersClient();

    const failure: unknown = await blockUser(client, uuidOf(121)).catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind: 'contract' });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.post(BLOCK_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      blockUser(client, uuidOf(121), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});

describe('unblockUser', () => {
  it('posts to the unblock address, without a body, and gives the user as it is now', async () => {
    const seen: { method: string; hasBody: boolean }[] = [];
    server.use(
      http.post(UNBLOCK_URL, async ({ request }) => {
        seen.push({ method: request.method, hasBody: (await request.text()) !== '' });
        return HttpResponse.json(ACTIVE);
      }),
    );
    const { client } = createUsersClient();

    const user = await unblockUser(client, uuidOf(121));

    expect(seen).toEqual([{ method: 'POST', hasBody: false }]);
    expect(user).toMatchObject({ id: uuidOf(121), status: { id: 1, name: 'Activo' } });
  });

  it.each([
    [404, 'user_not_found'],
    [409, 'user_already_active'],
    [409, 'user_deleted'],
    [409, 'auth0_account_not_found'],
    [502, 'identity_provider_error'],
    [503, 'identity_provider_unavailable'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.post(UNBLOCK_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await unblockUser(client, uuidOf(121)).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
