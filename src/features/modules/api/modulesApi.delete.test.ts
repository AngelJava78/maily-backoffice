import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { deleteModule } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('deleteModule', () => {
  it('sends DELETE /api/v1/modules/{id}', async () => {
    const mock = createModulesCatalogMock();
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

    await deleteModule(client(), 50);

    expect(mock.requestsTo('DELETE', '/api/v1/modules/50')).toHaveLength(1);
  });
});
