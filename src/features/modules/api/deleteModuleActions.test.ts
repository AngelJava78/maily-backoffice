import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import {
  createModulesCatalogMock,
  USERS_API_BASE_URL,
  type ModulesCatalogMock,
} from '@/test/handlers/modulesCatalog';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import { deleteModuleActions } from './deleteModuleActions';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

function permissionIds(
  mock: ModulesCatalogMock,
  moduleKey: string,
  actions: readonly ModuleActionKey[],
): Map<ModuleActionKey, number> {
  return new Map(
    actions.map((action) => [action, mock.state.createPermission({ name: `${moduleKey}:${action}` }).id]),
  );
}

describe('deleteModuleActions', () => {
  it('deletes every action, in the fixed order, and gives them all as removed', async () => {
    const mock = createModulesCatalogMock();
    const ids = permissionIds(mock, 'inventory', ['read', 'write', 'update']);

    const result = await deleteModuleActions(client(), ['write', 'read', 'update'], ids);

    expect(result.removed).toEqual(['read', 'write', 'update']);
    expect(result.failed).toEqual([]);
    expect(mock.requestsTo('DELETE', /\/api\/v1\/permissions\/\d+/)).toHaveLength(3);
  });

  it('treats a permission already gone (404) as removed, not as a failure', async () => {
    const mock = createModulesCatalogMock();
    const ids = permissionIds(mock, 'inventory', ['read']);
    const permissionId = ids.get('read');
    if (permissionId === undefined) {
      throw new Error('setup error: missing permission id');
    }
    mock.state.deletePermission(permissionId);

    const result = await deleteModuleActions(client(), ['read'], ids);

    expect(result.removed).toEqual(['read']);
    expect(result.failed).toEqual([]);
  });

  it('stops and marks the rest as failed after an infrastructure failure', async () => {
    const mock = createModulesCatalogMock();
    const ids = permissionIds(mock, 'inventory', ['read', 'write', 'update']);
    mock.failNext({ method: 'DELETE', path: /\/api\/v1\/permissions\/\d+/, status: 500, code: 'internal_error' });

    const result = await deleteModuleActions(client(), ['read', 'write', 'update'], ids);

    expect(result.removed).toEqual([]);
    expect(result.failed.map((failure) => failure.action)).toEqual(['read', 'write', 'update']);
  });
});
