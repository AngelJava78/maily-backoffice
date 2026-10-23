import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { createModuleActions } from './createModuleActions';
import { createModule } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('createModuleActions', () => {
  it('creates every action, in the fixed order, and gives them all as assigned', async () => {
    const mock = createModulesCatalogMock();
    await createModule(client(), { key: 'inventory', name: 'Inventario', type_id: 2 });

    const result = await createModuleActions(client(), 'inventory', ['write', 'read', 'update']);

    expect(result.assigned).toEqual(['read', 'write', 'update']);
    expect(result.failed).toEqual([]);
    expect(mock.requestsTo('POST', '/api/v1/permissions').map((request) => request.body)).toEqual([
      { name: 'inventory:read' },
      { name: 'inventory:write' },
      { name: 'inventory:update' },
    ]);
  });

  it('continues after a business failure and reports it as failed', async () => {
    const mock = createModulesCatalogMock();
    await createModule(client(), { key: 'inventory', name: 'Inventario', type_id: 2 });
    // A permission that already exists with that exact name (simulated race, research D11).
    mock.state.createPermission({ name: 'inventory:write' });

    const result = await createModuleActions(client(), 'inventory', ['read', 'write', 'update']);

    expect(result.assigned).toEqual(['read', 'update']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.action).toBe('write');
  });

  it('stops and marks the rest as failed after an infrastructure failure', async () => {
    const mock = createModulesCatalogMock();
    await createModule(client(), { key: 'inventory', name: 'Inventario', type_id: 2 });
    mock.failNext({
      method: 'POST',
      path: '/api/v1/permissions',
      status: 500,
      code: 'internal_error',
    });

    const result = await createModuleActions(client(), 'inventory', ['read', 'write', 'update']);

    expect(result.assigned).toEqual([]);
    expect(result.failed.map((failure) => failure.action)).toEqual(['read', 'write', 'update']);
  });
});
