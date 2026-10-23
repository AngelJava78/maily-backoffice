import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { deleteModuleAction, updateModule } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('updateModule', () => {
  it('sends PATCH /api/v1/modules/{id} with only the fields given, and gives the updated module', async () => {
    const mock = createModulesCatalogMock();
    mock.state.addModule({
      id: 99,
      key: 'inventory',
      name: 'Inventario',
      description: null,
      sortOrder: 10,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
    });

    const updated = await updateModule(client(), 99, { name: 'Almacén' });

    expect(updated.name).toBe('Almacén');
    expect(mock.requestsTo('PATCH', '/api/v1/modules/99')[0]?.body).toEqual({ name: 'Almacén' });
  });
});

describe('deleteModuleAction', () => {
  it('sends DELETE /api/v1/permissions/{id}', async () => {
    const mock = createModulesCatalogMock();
    const permissionId = mock.state.createPermission({ name: 'inventory:write' }).id;

    await deleteModuleAction(client(), permissionId);

    expect(mock.requestsTo('DELETE', `/api/v1/permissions/${permissionId}`)).toHaveLength(1);
  });

  it('resolves a 404 permission_not_found as success: the result it asked for already holds', async () => {
    createModulesCatalogMock();

    await expect(deleteModuleAction(client(), 404_404)).resolves.toBeUndefined();
  });
});
