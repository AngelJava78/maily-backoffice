import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { roleRecordDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { listUserRoles } from './userRolesApi';
import { uuidOf } from '@/test/ids';

const ROLES_URL = usersUrl(`/api/v1/users/${uuidOf(121)}/roles`);

describe('listUserRoles', () => {
  it('asks for the roles of the user and gives them in camelCase', async () => {
    const seen: { method: string; search: string; authorization: string | null }[] = [];
    server.use(
      http.get(ROLES_URL, ({ request }) => {
        seen.push({
          method: request.method,
          search: new URL(request.url).search,
          authorization: request.headers.get('authorization'),
        });
        return HttpResponse.json([
          roleRecordDto({ id: 4, name: 'Marketing' }),
          roleRecordDto({ id: 6, name: 'Doctor', description: 'Clínicas' }),
        ]);
      }),
    );
    const { client, authorization } = createUsersClient();

    const roles = await listUserRoles(client, uuidOf(121));

    expect(seen).toEqual([{ method: 'GET', search: '', authorization }]);
    expect(roles).toHaveLength(2);
    expect(roles[1]).toMatchObject({ id: 6, name: 'Doctor', description: 'Clínicas' });
    expect(roles[1]).toHaveProperty('createdAt');
  });

  it('accepts a user without roles', async () => {
    server.use(http.get(ROLES_URL, () => HttpResponse.json([])));
    const { client } = createUsersClient();

    await expect(listUserRoles(client, uuidOf(121))).resolves.toEqual([]);
  });

  it('passes a 409 user_blocked on as an ApiError with that code', async () => {
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json(errorBody('user_blocked'), { status: 409 })),
    );
    const { client } = createUsersClient();

    const failure: unknown = await listUserRoles(client, uuidOf(121)).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, code: 'user_blocked' });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.get(ROLES_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      listUserRoles(client, uuidOf(121), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
