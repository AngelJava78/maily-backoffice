import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { assignRole } from './userRolesApi';
import { uuidOf } from '@/test/ids';

const ROLES_URL = usersUrl(`/api/v1/users/${uuidOf(121)}/roles`);

describe('assignRole', () => {
  it('sends the id of the role as JSON and gives the assignment', async () => {
    const seen: { method: string; body: unknown }[] = [];
    server.use(
      http.post(ROLES_URL, async ({ request }) => {
        seen.push({ method: request.method, body: await request.json() });
        return HttpResponse.json(
          { user_id: uuidOf(121), role: { id: 4, name: 'Marketing' } },
          { status: 201 },
        );
      }),
    );
    const { client } = createUsersClient();

    const assignment = await assignRole(client, uuidOf(121), 4);

    expect(seen).toEqual([{ method: 'POST', body: { role_id: 4 } }]);
    expect(assignment).toEqual({ userId: uuidOf(121), role: { id: 4, name: 'Marketing' } });
  });

  it.each([
    [409, 'user_role_already_associated'],
    [404, 'role_not_found'],
    [409, 'user_blocked'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.post(ROLES_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await assignRole(client, uuidOf(121), 4).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    server.use(
      http.post(ROLES_URL, () => HttpResponse.json({ user_id: uuidOf(121) }, { status: 201 })),
    );
    const { client } = createUsersClient();

    const failure: unknown = await assignRole(client, uuidOf(121), 4).catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({ kind: 'contract' });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.post(ROLES_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      assignRole(client, uuidOf(121), 4, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
