import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { listModules } from './modulesApi';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('listModules', () => {
  it('crosses the modules with their permissions and gives each one its actions', async () => {
    createModulesCatalogMock();

    const result = await listModules(client());

    expect(result).toHaveLength(23);
    const appointments = result.find((module) => module.key === 'appointments');
    expect([...(appointments?.actions ?? [])]).toEqual(['read', 'write', 'update', 'delete']);
    const dashboard = result.find((module) => module.key === 'dashboard');
    expect([...(dashboard?.actions ?? [])]).toEqual(['read']);
  });

  it('keeps the order the API already gives: sort_order first, name breaks a tie, both across every type', async () => {
    createModulesCatalogMock();

    const result = await listModules(client());

    for (let index = 1; index < result.length; index += 1) {
      const previous = result[index - 1];
      const current = result[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (previous !== undefined && current !== undefined) {
        const inOrder =
          previous.sortOrder < current.sortOrder ||
          (previous.sortOrder === current.sortOrder && previous.name.localeCompare(current.name) <= 0);
        expect(inOrder).toBe(true);
      }
    }
    // "Pacientes" (Clínica, sort_order 10) and "Usuarios" (Sistema, sort_order 10) tie: the API does
    // not group by type (research D13), so the name decides between them.
    expect(result.map((module) => module.key).slice(0, 2)).toEqual(['patients', 'users']);
  });

  it('sends status_id only when it is given', async () => {
    const mock = createModulesCatalogMock();

    await listModules(client());
    await listModules(client(), { statusId: 2 });

    const requests = mock.requestsTo('GET', '/api/v1/modules');
    expect(requests[0]?.search).toBe('');
    expect(requests[1]?.search).toBe('?status_id=2');
  });
});
