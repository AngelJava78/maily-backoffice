import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/server';
import { createUsersClient, usersUrl } from '@/test/usersClient';

import { listModules } from './modulesApi';

describe('listModules', () => {
  it('asks for the modules of the given type and gives them in camelCase', async () => {
    let search = '';
    server.use(
      http.get(usersUrl('/api/v1/modules'), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([
          {
            id: 5,
            key: 'patients',
            name: 'Pacientes',
            description: null,
            sort_order: 50,
            created_at: '2026-10-15T05:57:30.521Z',
            status: { id: 1, name: 'Activo' },
            type: { id: 2, name: 'Clínica' },
            active_permissions_count: 4,
          },
        ]);
      }),
    );
    const { client } = createUsersClient();

    const modules = await listModules(client, 2);

    expect(search).toBe('?type_id=2&status_id=1');
    expect(modules).toEqual([{ id: 5, key: 'patients', name: 'Pacientes', sortOrder: 50, type: { id: 2, name: 'Clínica' } }]);
  });
});
