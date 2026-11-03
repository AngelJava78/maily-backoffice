import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import type { ModuleCapabilities } from '..';
import { ModuleDangerZone } from './ModuleDangerZone';

const FULL_ACCESS: ModuleCapabilities = {
  canCreate: true,
  canEdit: true,
  canBlock: true,
  canUnblock: true,
  canDelete: true,
};

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 500,
    key: 'demo_parent',
    name: 'Demo padre',
    description: null,
    sortOrder: 5,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    parentModule: null,
    actions: new Set(),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

function renderZone(
  props: {
    readonly module?: SystemModule;
    readonly submoduleCount?: number;
    readonly capabilities?: ModuleCapabilities;
    readonly onDeleted?: () => void;
  } = {},
) {
  return renderWithProviders(
    <ModuleDangerZone
      module={props.module ?? module()}
      capabilities={props.capabilities ?? FULL_ACCESS}
      onDeleted={props.onDeleted ?? vi.fn()}
      submoduleCount={props.submoduleCount ?? 0}
    />,
  );
}

const notice = (count: number) =>
  count === 1
    ? 'Si lo bloqueas, 1 submódulo dejará de estar disponible hasta que lo desbloquees; conserva su propio estatus.'
    : `Si lo bloqueas, ${count} submódulos dejarán de estar disponibles hasta que lo desbloquees; conservan su propio estatus.`;

const BLOCKED_BY_SUBMODULES =
  'Este módulo tiene submódulos. Para eliminarlo, primero elimina sus submódulos o cámbialos de padre.';

describe('ModuleDangerZone, a module with submodules (spec 024, user story 3)', () => {
  it('says how many Active submodules will stop being available if it is blocked', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 3 });

    expect(screen.getByText(notice(3))).toBeVisible();
  });

  it('uses the singular for a single submodule', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 1 });

    expect(screen.getByText(notice(1))).toBeVisible();
  });

  it('says nothing about submodules for a module that has none', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 0 });

    expect(screen.queryByText(/submódulo/)).not.toBeInTheDocument();
  });

  it('does not warn about blocking a module that is already Blocked', () => {
    createModulesCatalogMock();
    renderZone({ module: module({ statusId: 2 }), submoduleCount: 2 });

    expect(screen.queryByText(notice(2))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desbloquear módulo' })).toBeVisible();
  });

  it('offers no "Eliminar módulo" while it has submodules, and explains what to do first', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 2 });

    expect(screen.queryByRole('button', { name: 'Eliminar módulo' })).not.toBeInTheDocument();
    expect(screen.getByText(BLOCKED_BY_SUBMODULES)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bloquear módulo' })).toBeVisible();
  });

  it('offers "Eliminar módulo" as always for a module without submodules', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 0 });

    expect(screen.getByRole('button', { name: 'Eliminar módulo' })).toBeVisible();
    expect(screen.queryByText(BLOCKED_BY_SUBMODULES)).not.toBeInTheDocument();
  });

  it('does not explain what to do to delete without the permission to delete', () => {
    createModulesCatalogMock();
    renderZone({ submoduleCount: 2, capabilities: { ...FULL_ACCESS, canDelete: false } });

    expect(screen.queryByText(BLOCKED_BY_SUBMODULES)).not.toBeInTheDocument();
  });

  it('keeps the explanation of a base module as it was, with nothing about submodules', () => {
    createModulesCatalogMock();
    renderZone({ module: module({ key: 'users', name: 'Usuarios' }), submoduleCount: 0 });

    expect(screen.getByText(/no se pueden bloquear ni eliminar/)).toBeVisible();
  });

  it('shows the same advice, deletes nothing and does not close, when the service refuses because of submodules that are not in the list', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    mock.addModule(catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre' }));
    // Blocked, so the Active list the screen shows does not have it: the screen counts none.
    mock.addModule(catalogModule({ id: 501, key: 'demo_child', parentModuleId: 500, statusId: 2 }));
    const onDeleted = vi.fn();
    renderZone({ onDeleted, submoduleCount: 0 });

    await user.click(screen.getByRole('button', { name: 'Eliminar módulo' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText(
        'Este módulo tiene submódulos y no se puede eliminar: primero elimínalos o cámbialos de padre.',
      ),
    ).toBeVisible();
    expect(mock.state.findModule(500)?.statusId).toBe(1);
    expect(onDeleted).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
