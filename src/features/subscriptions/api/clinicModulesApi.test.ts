import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/server';
import { createUsersClient, usersUrl } from '@/test/usersClient';

import { listClinicModules } from './clinicModulesApi';

describe('listClinicModules', () => {
  it('asks for active clinic modules and gives them in camelCase', async () => {
    let search = '';
    server.use(
      http.get(usersUrl('/api/v1/modules'), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([
          {
            id: 8,
            key: 'appointments',
            name: 'Citas',
            description: 'Registro y confirmación de citas de pacientes.',
            sort_order: 80,
            created_at: '2026-10-22T20:11:25.816275Z',
            status: { id: 1, name: 'Activo' },
            type: { id: 2, name: 'Clínica' },
            active_permissions_count: 5,
          },
        ]);
      }),
    );
    const { client } = createUsersClient();

    const modules = await listClinicModules(client);

    expect(search).toBe('?type_id=2&status_id=1');
    expect(modules).toEqual([
      {
        key: 'appointments',
        name: 'Citas',
        description: 'Registro y confirmación de citas de pacientes.',
        sortOrder: 80,
      },
    ]);
  });
});
