import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL } from '@/test/handlers/modulesCatalog';

import { createModuleWithActions } from './createModuleWithActions';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

describe('createModuleWithActions', () => {
  it('gives "created" when the module and every action succeed', async () => {
    createModulesCatalogMock();

    const outcome = await createModuleWithActions(
      client(),
      { key: 'inventory', name: 'Inventario', type_id: 2 },
      ['read', 'write'],
    );

    expect(outcome.kind).toBe('created');
    expect(outcome.module.key).toBe('inventory');
    if (outcome.kind === 'created') {
      expect(outcome.assigned).toEqual(['read', 'write']);
    }
  });

  it('gives "partial" when the module is created but an action fails', async () => {
    const mock = createModulesCatalogMock();
    mock.state.createPermission({ name: 'inventory:write' });

    const outcome = await createModuleWithActions(
      client(),
      { key: 'inventory', name: 'Inventario', type_id: 2 },
      ['read', 'write'],
    );

    expect(outcome.kind).toBe('partial');
    if (outcome.kind === 'partial') {
      expect(outcome.assigned).toEqual(['read']);
      expect(outcome.failed.map((failure) => failure.action)).toEqual(['write']);
    }
  });

  it('does not create any action when the module itself fails', async () => {
    const mock = createModulesCatalogMock();
    mock.state.addModule({
      id: 1,
      key: 'inventory',
      name: 'Inventario',
      description: null,
      sortOrder: 10,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
    });

    await expect(
      createModuleWithActions(client(), { key: 'inventory', name: 'Otro', type_id: 2 }, ['read']),
    ).rejects.toThrow(ApiError);
    expect(mock.requestsTo('POST', '/api/v1/permissions')).toHaveLength(0);
  });
});
