import Dialog from '@mui/material/Dialog';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useId, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { renderWithProviders } from '@/test/renderWithProviders';
import {
  catalogModule,
  createModulesCatalogMock,
  USERS_API_BASE_URL,
  type ModulesCatalogMock,
} from '@/test/handlers/modulesCatalog';

import { listModules } from '../api/modulesApi';
import type { SystemModule } from '../schemas/systemModule';
import type { ModuleCapabilities } from '..';
import { ModuleEditPanel } from './ModuleEditPanel';

const FULL_ACCESS: ModuleCapabilities = {
  canCreate: true,
  canEdit: true,
  canBlock: true,
  canUnblock: true,
  canDelete: true,
};

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

/** The real 23-module catalog, plus a parent (500) with a submodule (501) and a loose module (502). */
function seed(): ModulesCatalogMock {
  const mock = createModulesCatalogMock();
  mock.addModule(catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }));
  mock.addModule(
    catalogModule({ id: 501, key: 'demo_child', name: 'Demo hija', parentModuleId: 500 }),
  );
  mock.addModule(catalogModule({ id: 502, key: 'demo_loose', name: 'Demo suelto', sortOrder: 6 }));
  mock.addModule(catalogModule({ id: 503, key: 'demo_other', name: 'Demo otro', sortOrder: 7 }));
  return mock;
}

async function moduleByKey(key: string, statusId = 1): Promise<SystemModule> {
  const found = (await listModules(client(), { statusId })).find((module) => module.key === key);
  if (found === undefined) {
    throw new Error(`setup error: missing the ${key} module`);
  }
  return found;
}

function DialogHarness({ children }: { readonly children: (titleId: string) => ReactNode }) {
  const titleId = useId();
  return (
    <Dialog open aria-labelledby={titleId}>
      {children(titleId)}
    </Dialog>
  );
}

function renderPanel(
  module: SystemModule,
  {
    submoduleCount = 0,
    onParentAssigned,
  }: { submoduleCount?: number; onParentAssigned?: (id: number) => void } = {},
) {
  return renderWithProviders(
    <DialogHarness>
      {(titleId) => (
        <ModuleEditPanel
          module={module}
          capabilities={FULL_ACCESS}
          titleId={titleId}
          onDeleted={vi.fn()}
          submoduleCount={submoduleCount}
          onParentAssigned={onParentAssigned}
        />
      )}
    </DialogHarness>,
  );
}

const parentField = () => screen.getByRole('combobox', { name: 'Módulo padre' });

async function waitForOptions() {
  await waitFor(() => {
    expect(parentField()).not.toHaveAttribute('aria-disabled', 'true');
  });
}

async function choose(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.click(parentField());
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('ModuleEditPanel, the parent module (spec 024, user story 2)', () => {
  it('shows "Ninguno" for a top-level module and the parent for a submodule', async () => {
    seed();
    const { unmount } = renderPanel(await moduleByKey('demo_loose'));
    await waitForOptions();
    expect(parentField()).toHaveTextContent('Ninguno (módulo de primer nivel)');
    unmount();

    renderPanel(await moduleByKey('demo_child'));
    await waitForOptions();
    expect(parentField()).toHaveTextContent('Demo padre');
  });

  it('offers only parents that are valid for the module: top level, Active, same type, not the module itself', async () => {
    const user = userEvent.setup();
    seed();
    renderPanel(await moduleByKey('demo_loose'));
    await waitForOptions();

    await user.click(parentField());

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toContain('Ninguno (módulo de primer nivel)');
    expect(options).toContain('Demo padre');
    expect(options).not.toContain('Demo suelto');
    expect(options).not.toContain('Demo hija');
    expect(options).not.toContain('Usuarios');
  });

  it('gives a top-level module a parent: sends parent_module_id and tells the page', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const onParentAssigned = vi.fn();
    const module = await moduleByKey('demo_loose');
    renderPanel(module, { onParentAssigned });
    await waitForOptions();

    await choose(user, 'Demo padre');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)[0]?.body).toEqual({
      parent_module_id: 500,
    });
    expect(onParentAssigned).toHaveBeenCalledWith(500);
  });

  it('removes the parent of a submodule: sends parent_module_id null and does not ask to expand anything', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const onParentAssigned = vi.fn();
    const module = await moduleByKey('demo_child');
    renderPanel(module, { onParentAssigned });
    await waitForOptions();

    await choose(user, 'Ninguno (módulo de primer nivel)');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)[0]?.body).toEqual({
      parent_module_id: null,
    });
    expect(onParentAssigned).not.toHaveBeenCalled();
  });

  it('sends no PATCH when the parent was not changed', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const module = await moduleByKey('demo_child');
    renderPanel(module);
    await waitForOptions();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText('Cambios guardados.');
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)).toHaveLength(0);
  });

  it('locks the field, with its reason, when the module has submodules in the list', async () => {
    seed();
    renderPanel(await moduleByKey('demo_parent'), { submoduleCount: 1 });

    expect(parentField()).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Este módulo tiene submódulos, así que no puede tener un módulo padre.'),
    ).toBeVisible();
  });

  it('locks the field for a base module, with its reason', async () => {
    seed();
    renderPanel(await moduleByKey('users'));

    expect(parentField()).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Los módulos base de administración no tienen módulo padre.'),
    ).toBeVisible();
  });

  it('shows a Blocked parent as the current value even though it is not offered', async () => {
    const mock = seed();
    mock.state.blockModule(500);
    // The submodule is only listed while it is Blocked itself (its parent is not Active).
    mock.state.blockModule(501);
    renderPanel(await moduleByKey('demo_child', 2));
    await waitForOptions();

    expect(parentField()).toHaveTextContent('Demo padre');
  });

  it.each([
    ['module_parent_not_found', 'El módulo padre ya no existe o fue eliminado. Elige otro.'],
    [
      'module_parent_is_submodule',
      'Ese módulo ya es un submódulo y no puede ser padre: la jerarquía tiene un solo nivel. Elige otro.',
    ],
  ])('shows the refusal %s next to the field and keeps what was written', async (code, message) => {
    const user = userEvent.setup();
    const mock = seed();
    const module = await moduleByKey('demo_loose');
    renderPanel(module);
    await waitForOptions();
    await choose(user, 'Demo padre');
    await user.clear(screen.getByRole('textbox', { name: 'Descripción' }));
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Lo que escribí');
    // Another session changed the world between loading the form and saving it.
    if (code === 'module_parent_not_found') {
      mock.state.deleteModule(501);
      mock.state.deleteModule(500);
    } else {
      mock.state.updateModule(501, { parent_module_id: null });
      mock.state.updateModule(500, { parent_module_id: 503 });
    }

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const field = await screen.findByText(message);
    expect(field).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('Lo que escribí');
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }),
    ).toBeEnabled();
  });
});
