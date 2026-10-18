import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { unassignRole } from './userRolesApi';

const ROLE_URL = usersUrl('/api/v1/users/121/roles/4');

describe('unassignRole', () => {
  it('asks to remove the role with a DELETE and gives nothing back for the 204', async () => {
    const seen: { method: string; hasBody: boolean; authorization: string | null }[] = [];
    server.use(
      http.delete(ROLE_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          hasBody: (await request.text()) !== '',
          authorization: request.headers.get('authorization'),
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client, authorization } = createUsersClient();

    await expect(unassignRole(client, 121, 4)).resolves.toBeUndefined();

    expect(seen).toEqual([{ method: 'DELETE', hasBody: false, authorization }]);
  });

  it.each([
    [409, 'user_role_not_associated'],
    [404, 'role_not_found'],
    [409, 'user_blocked'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.delete(ROLE_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await unassignRole(client, 121, 4).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.delete(ROLE_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      unassignRole(client, 121, 4, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
