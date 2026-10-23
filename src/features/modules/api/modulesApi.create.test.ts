import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { createModule, createModuleAction } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('createModule', () => {
  it('sends POST /api/v1/modules with the body and gives the created module', async () => {
    const mock = createModulesCatalogMock();

    const created = await createModule(client(), {
      key: 'inventory',
      name: 'Inventario',
      type_id: 2,
    });

    expect(created.key).toBe('inventory');
    expect(mock.requestsTo('POST', '/api/v1/modules')[0]?.body).toEqual({
      key: 'inventory',
      name: 'Inventario',
      type_id: 2,
    });
  });
});

describe('createModuleAction', () => {
  it('sends POST /api/v1/permissions with "<key>:<accion>" and gives its id', async () => {
    const mock = createModulesCatalogMock();
    await createModule(client(), { key: 'inventory', name: 'Inventario', type_id: 2 });

    const permissionId = await createModuleAction(client(), 'inventory', 'write');

    expect(typeof permissionId).toBe('number');
    expect(mock.requestsTo('POST', '/api/v1/permissions')[0]?.body).toEqual({
      name: 'inventory:write',
    });
  });
});
