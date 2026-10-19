import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { roleRecordDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { listRoles } from './rolesApi';

const ROLES_URL = usersUrl('/api/v1/roles');

describe('listRoles', () => {
  it('asks for the catalog of roles and gives it in camelCase', async () => {
    const seen: { method: string; search: string; authorization: string | null }[] = [];
    server.use(
      http.get(ROLES_URL, ({ request }) => {
        seen.push({
          method: request.method,
          search: new URL(request.url).search,
          authorization: request.headers.get('authorization'),
        });
        return HttpResponse.json([
          roleRecordDto({ id: 1, name: 'Administrator', description: 'Todo' }),
          roleRecordDto({ id: 4, name: 'Marketing' }),
        ]);
      }),
    );
    const { client, authorization } = createUsersClient();

    const roles = await listRoles(client);

    expect(seen).toEqual([{ method: 'GET', search: '', authorization }]);
    expect(roles.map((role) => role.name)).toEqual(['Administrator', 'Marketing']);
    expect(roles[0]).toMatchObject({ id: 1, description: 'Todo' });
    expect(roles[0]).toHaveProperty('createdAt');
  });

  it('accepts an empty catalog', async () => {
    server.use(http.get(ROLES_URL, () => HttpResponse.json([])));
    const { client } = createUsersClient();

    await expect(listRoles(client)).resolves.toEqual([]);
  });

  it('passes a 403 permission_denied on as an ApiError', async () => {
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json(errorBody('permission_denied'), { status: 403 })),
    );
    const { client } = createUsersClient();

    const failure: unknown = await listRoles(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, code: 'permission_denied' });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.get(ROLES_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      listRoles(client, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
