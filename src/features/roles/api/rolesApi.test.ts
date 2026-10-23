import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { createRole, deleteRole, listRoles, updateRole } from './rolesApi';

const ROLES_URL = usersUrl('/api/v1/roles');

function roleDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 6,
    name: 'Doctor',
    description: null,
    created_at: '2026-10-15T05:57:30.521Z',
    status: { id: 1, name: 'Activo' },
    type: { id: 2, name: 'Clínica' },
    ...overrides,
  };
}

describe('listRoles', () => {
  it('asks for the active roles and gives them in camelCase, with their type', async () => {
    server.use(http.get(ROLES_URL, () => HttpResponse.json([roleDto()])));
    const { client } = createUsersClient();

    const roles = await listRoles(client);

    expect(roles).toEqual([
      {
        id: 6,
        name: 'Doctor',
        description: null,
        createdAt: '2026-10-15T05:57:30.521Z',
        status: { id: 1, name: 'Activo' },
        type: { id: 2, name: 'Clínica' },
      },
    ]);
  });

  it('passes a 403 on as an ApiError', async () => {
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json(errorBody('permission_denied'), { status: 403 })),
    );
    const { client } = createUsersClient();

    const failure: unknown = await listRoles(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ code: 'permission_denied' });
  });
});

describe('createRole', () => {
  it('sends name, description and type_id, and gives the role created', async () => {
    let body: unknown;
    server.use(
      http.post(ROLES_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          roleDto({ id: 10, name: 'Auditor', type: { id: 1, name: 'Sistema' } }),
          {
            status: 201,
          },
        );
      }),
    );
    const { client } = createUsersClient();

    const role = await createRole(client, { name: 'Auditor', description: null, typeId: 1 });

    expect(body).toEqual({ name: 'Auditor', description: null, type_id: 1 });
    expect(role).toMatchObject({ id: 10, name: 'Auditor', type: { id: 1 } });
  });

  it('passes a 409 role_name_already_exists on as an ApiError', async () => {
    server.use(
      http.post(ROLES_URL, () =>
        HttpResponse.json(errorBody('role_name_already_exists'), { status: 409 }),
      ),
    );
    const { client } = createUsersClient();

    const failure: unknown = await createRole(client, {
      name: 'Doctor',
      description: null,
      typeId: 2,
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 409, code: 'role_name_already_exists' });
  });
});

describe('updateRole', () => {
  it('sends only the changed fields', async () => {
    let body: unknown;
    server.use(
      http.patch(`${ROLES_URL}/6`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(roleDto({ name: 'Doctor General' }));
      }),
    );
    const { client } = createUsersClient();

    const role = await updateRole(client, 6, { name: 'Doctor General' });

    expect(body).toEqual({ name: 'Doctor General' });
    expect(role.name).toBe('Doctor General');
  });

  it('sends description: null explicitly, telling it apart from not sending it', async () => {
    let body: unknown;
    server.use(
      http.patch(`${ROLES_URL}/6`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(roleDto({ description: null }));
      }),
    );
    const { client } = createUsersClient();

    await updateRole(client, 6, { description: null });

    expect(body).toEqual({ description: null });
  });
});

describe('deleteRole', () => {
  it('sends DELETE and reads the empty answer as nothing', async () => {
    let method = '';
    server.use(
      http.delete(`${ROLES_URL}/6`, ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client } = createUsersClient();

    await expect(deleteRole(client, 6)).resolves.toBeUndefined();
    expect(method).toBe('DELETE');
  });
});
