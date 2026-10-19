import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { userDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { deleteUser, reactivateUser } from './usersApi';

const USER_URL = usersUrl('/api/v1/users/121');
const REACTIVATE_URL = usersUrl('/api/v1/users/121/reactivate');

describe('deleteUser', () => {
  it('sends a DELETE to the user, accepts the 204 without a body and gives nothing back', async () => {
    const seen: { method: string; hasBody: boolean; authorization: string | null }[] = [];
    server.use(
      http.delete(USER_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          hasBody: (await request.text()) !== '',
          authorization: request.headers.get('authorization'),
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client, authorization } = createUsersClient();

    await expect(deleteUser(client, 121)).resolves.toBeUndefined();

    expect(seen).toEqual([{ method: 'DELETE', hasBody: false, authorization }]);
  });

  it.each([
    [404, 'user_not_found'],
    [409, 'user_deleted'],
    // A blocked user has to be unblocked before it can be deleted.
    [409, 'user_blocked'],
    [502, 'identity_provider_error'],
    [503, 'identity_provider_unavailable'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.delete(USER_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await deleteUser(client, 121).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.delete(USER_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      deleteUser(client, 121, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});

describe('reactivateUser', () => {
  it('posts to the reactivate address, without a body, and gives the user as it is now', async () => {
    const seen: { method: string; hasBody: boolean }[] = [];
    server.use(
      http.post(REACTIVATE_URL, async ({ request }) => {
        seen.push({ method: request.method, hasBody: (await request.text()) !== '' });
        return HttpResponse.json(userDto({ status: { id: 1, name: 'Activo' } }));
      }),
    );
    const { client } = createUsersClient();

    const user = await reactivateUser(client, 121);

    expect(seen).toEqual([{ method: 'POST', hasBody: false }]);
    expect(user).toMatchObject({ id: 121, status: { id: 1, name: 'Activo' } });
  });

  it.each([
    [404, 'user_not_found'],
    [409, 'user_already_active'],
    [409, 'user_blocked'],
    [409, 'auth0_account_not_found'],
    [502, 'identity_provider_error'],
    [503, 'identity_provider_unavailable'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.post(REACTIVATE_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await reactivateUser(client, 121).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
