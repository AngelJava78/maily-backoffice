import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { associateRolePermission, disassociateRolePermission, listRolePermissions } from './rolePermissionsApi';

const PERMISSIONS_URL = usersUrl('/api/v1/roles/6/permissions');

function permissionDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 25,
    name: 'patients:read',
    description: null,
    created_at: '2026-10-15T05:57:30.521Z',
    status: { id: 1, name: 'Activo' },
    module: { id: 5, key: 'patients', name: 'Pacientes', type: { id: 2, name: 'Clínica' } },
    action: { id: 1, key: 'read', name: 'Ver' },
    ...overrides,
  };
}

describe('listRolePermissions', () => {
  it("gives the role's permissions in camelCase", async () => {
    server.use(http.get(PERMISSIONS_URL, () => HttpResponse.json([permissionDto()])));
    const { client } = createUsersClient();

    const permissions = await listRolePermissions(client, 6);

    expect(permissions).toEqual([
      {
        id: 25,
        name: 'patients:read',
        module: { id: 5, key: 'patients', name: 'Pacientes', type: { id: 2, name: 'Clínica' } },
        action: { id: 1, key: 'read', name: 'Ver' },
      },
    ]);
  });
});

describe('associateRolePermission', () => {
  it('sends permission_id in the body', async () => {
    let body: unknown;
    server.use(
      http.post(PERMISSIONS_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { role: { id: 6, name: 'Doctor', type: { id: 2 } }, permission: { id: 25, name: 'patients:read' } },
          { status: 201 },
        );
      }),
    );
    const { client } = createUsersClient();

    await associateRolePermission(client, 6, 25);

    expect(body).toEqual({ permission_id: 25 });
  });

  it('passes a 409 conflict on as an ApiError', async () => {
    server.use(
      http.post(PERMISSIONS_URL, () =>
        HttpResponse.json(errorBody('role_permission_module_type_conflict'), { status: 409 }),
      ),
    );
    const { client } = createUsersClient();

    const failure: unknown = await associateRolePermission(client, 6, 25).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 409, code: 'role_permission_module_type_conflict' });
  });
});

describe('disassociateRolePermission', () => {
  it('sends DELETE to the permission path', async () => {
    let method = '';
    server.use(
      http.delete(`${PERMISSIONS_URL}/25`, ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client } = createUsersClient();

    await expect(disassociateRolePermission(client, 6, 25)).resolves.toBeUndefined();
    expect(method).toBe('DELETE');
  });
});
