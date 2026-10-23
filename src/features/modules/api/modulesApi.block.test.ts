import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { blockModule, unblockModule } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

function seedInventory(mock: ReturnType<typeof createModulesCatalogMock>): void {
  mock.state.addModule({
    id: 50,
    key: 'inventory',
    name: 'Inventario',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: 2,
  });
}

describe('blockModule', () => {
  it('sends POST /api/v1/modules/{id}/block and gives the blocked module', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);

    const blocked = await blockModule(client(), 50);

    expect(blocked.statusId).toBe(2);
    expect(mock.requestsTo('POST', '/api/v1/modules/50/block')).toHaveLength(1);
  });
});

describe('unblockModule', () => {
  it('sends POST /api/v1/modules/{id}/unblock and gives the active module', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);
    await blockModule(client(), 50);

    const unblocked = await unblockModule(client(), 50);

    expect(unblocked.statusId).toBe(1);
    expect(mock.requestsTo('POST', '/api/v1/modules/50/unblock')).toHaveLength(1);
  });
});
