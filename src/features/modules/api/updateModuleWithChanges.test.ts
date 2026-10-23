import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { createHttpClient } from '@/shared/api/httpClient';
import { createModulesCatalogMock, USERS_API_BASE_URL, type ModulesCatalogMock } from '@/test/handlers/modulesCatalog';

import { MODULE_ACTION_ID } from '../schemas/moduleActionCatalog';
import { getChangedActions } from '../schemas/moduleForm';
import type { SystemModule } from '../schemas/systemModule';
import { listModules } from './modulesApi';
import { updateModuleWithChanges } from './updateModuleWithChanges';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

function seedInventory(mock: ModulesCatalogMock): void {
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
  mock.state.addPermission({
    id: 500,
    name: 'inventory:read',
    description: null,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    moduleId: 50,
    actionId: MODULE_ACTION_ID.read,
  });
  mock.state.addPermission({
    id: 501,
    name: 'inventory:write',
    description: null,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    moduleId: 50,
    actionId: MODULE_ACTION_ID.write,
  });
}

async function inventoryModule(): Promise<SystemModule> {
  const found = (await listModules(client())).find((candidate) => candidate.key === 'inventory');
  if (found === undefined) {
    throw new Error('setup error: missing the inventory module');
  }
  return found;
}

describe('updateModuleWithChanges', () => {
  it('applies the PATCH and the changed actions, in sequence, and gives "saved" (FR-014, FR-016, FR-017)', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);
    const module = await inventoryModule();

    const outcome = await updateModuleWithChanges(
      client(),
      module,
      { name: 'Almacén' },
      getChangedActions(module.actions, new Set(['read', 'update'])),
    );

    expect(outcome).toEqual({ kind: 'saved' });
    expect(mock.requestsTo('PATCH', '/api/v1/modules/50')[0]?.body).toEqual({ name: 'Almacén' });
    expect(mock.requestsTo('POST', '/api/v1/permissions')[0]?.body).toEqual({ name: 'inventory:update' });
    expect(mock.requestsTo('DELETE', '/api/v1/permissions/501')).toHaveLength(1);
  });

  it('sends no PATCH when nothing of name/description/order changed', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);
    const module = await inventoryModule();

    await updateModuleWithChanges(client(), module, null, getChangedActions(module.actions, new Set(['read'])));

    expect(mock.requestsTo('PATCH', '/api/v1/modules/50')).toHaveLength(0);
    expect(mock.requestsTo('DELETE', '/api/v1/permissions/501')).toHaveLength(1);
  });

  it('gives "partial" with which action failed when marking a new one conflicts (research D11)', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);
    const module = await inventoryModule();
    // Someone else already created this exact permission (simulated race).
    mock.state.createPermission({ name: 'inventory:update' });

    const outcome = await updateModuleWithChanges(
      client(),
      module,
      null,
      getChangedActions(module.actions, new Set(['read', 'write', 'update'])),
    );

    expect(outcome).toEqual({ kind: 'partial', addedOk: [], removedOk: [], failed: ['update'] });
  });

  it('does not touch any action when the PATCH itself fails', async () => {
    const mock = createModulesCatalogMock();
    seedInventory(mock);
    mock.state.addModule({
      id: 51,
      key: 'billing',
      name: 'Facturación',
      description: null,
      sortOrder: 20,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
    });
    const module = await inventoryModule();

    await expect(
      updateModuleWithChanges(
        client(),
        module,
        { name: 'Facturación' },
        getChangedActions(module.actions, new Set(['read'])),
      ),
    ).rejects.toThrow(ApiError);
    expect(mock.requestsTo('DELETE', '/api/v1/permissions/501')).toHaveLength(0);
  });
});
