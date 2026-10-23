import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/server';
import { createUsersClient, usersUrl } from '@/test/usersClient';

import { listPermissions } from './permissionsApi';

describe('listPermissions', () => {
  it('gives the whole catalog in camelCase', async () => {
    server.use(
      http.get(usersUrl('/api/v1/permissions'), () =>
        HttpResponse.json([
          {
            id: 1,
            name: 'users:read',
            description: null,
            created_at: '2026-10-15T05:57:30.521Z',
            status: { id: 1, name: 'Activo' },
            module: { id: 1, key: 'users', name: 'Usuarios', type: { id: 1, name: 'Sistema' } },
            action: { id: 1, key: 'read', name: 'Ver' },
          },
        ]),
      ),
    );
    const { client } = createUsersClient();

    const permissions = await listPermissions(client);

    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({ id: 1, name: 'users:read' });
  });
});
