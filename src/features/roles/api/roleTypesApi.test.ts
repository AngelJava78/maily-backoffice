import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/server';
import { createUsersClient, usersUrl } from '@/test/usersClient';

import { listRoleTypes } from './roleTypesApi';

describe('listRoleTypes', () => {
  it('gives the fixed catalog of the two role types', async () => {
    server.use(
      http.get(usersUrl('/api/v1/role-types'), () =>
        HttpResponse.json([
          { id: 1, name: 'Sistema' },
          { id: 2, name: 'Clínica' },
        ]),
      ),
    );
    const { client } = createUsersClient();

    await expect(listRoleTypes(client)).resolves.toEqual([
      { id: 1, name: 'Sistema' },
      { id: 2, name: 'Clínica' },
    ]);
  });
});
