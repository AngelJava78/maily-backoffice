import Dialog from '@mui/material/Dialog';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useId } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import {
  catalogModule,
  createModulesCatalogMock,
  type ModulesCatalogMock,
} from '@/test/handlers/modulesCatalog';

import { ModuleCreatePanel } from './ModuleCreatePanel';

function Harness({
  onCreated = vi.fn(),
  onParentAssigned,
}: {
  readonly onCreated?: (moduleId: number) => void;
  readonly onParentAssigned?: (parentModuleId: number) => void;
}) {
  const titleId = useId();
  return (
    <Dialog open aria-labelledby={titleId}>
      <ModuleCreatePanel
        nextSortOrder={160}
        titleId={titleId}
        onCreated={onCreated}
        onParentAssigned={onParentAssigned}
        onCancel={vi.fn()}
      />
    </Dialog>
  );
}

/** The real catalog plus a Clínica parent (500) and a Sistema one (600). */
function seed(): ModulesCatalogMock {
  const mock = createModulesCatalogMock();
  mock.addModule(catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }));
  mock.addModule(
    catalogModule({ id: 501, key: 'demo_child', name: 'Demo hija', parentModuleId: 500 }),
  );
  mock.addModule(
    catalogModule({ id: 600, key: 'demo_system', name: 'Demo sistema', typeId: 1, sortOrder: 6 }),
  );
  return mock;
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

describe('ModuleCreatePanel, the parent module (spec 024, user story 2)', () => {
  it('has the field "Módulo padre", with "Ninguno (módulo de primer nivel)" chosen', async () => {
    seed();
    renderWithProviders(<Harness />);
    await waitForOptions();

    expect(parentField()).toHaveTextContent('Ninguno (módulo de primer nivel)');
  });

  it('offers only top-level, Active modules of the type chosen, and never a base module', async () => {
    const user = userEvent.setup();
    seed();
    renderWithProviders(<Harness />);
    await waitForOptions();

    await user.click(parentField());

    const clinic = screen.getAllByRole('option').map((option) => option.textContent);
    expect(clinic).toContain('Demo padre');
    expect(clinic).not.toContain('Demo hija');
    expect(clinic).not.toContain('Demo sistema');
    expect(clinic).not.toContain('Usuarios');
  });

  it('follows the type: the options of Sistema are not those of Clínica', async () => {
    const user = userEvent.setup();
    seed();
    renderWithProviders(<Harness />);
    await waitForOptions();

    await user.click(screen.getByRole('radio', { name: /Sistema/ }));
    await waitForOptions();
    await user.click(parentField());

    const system = screen.getAllByRole('option').map((option) => option.textContent);
    expect(system).toContain('Demo sistema');
    expect(system).not.toContain('Demo padre');
    expect(system).not.toContain('Usuarios');
  });

  it('clears the parent that was chosen when the type changes (FR-011)', async () => {
    const user = userEvent.setup();
    seed();
    renderWithProviders(<Harness />);
    await waitForOptions();
    await choose(user, 'Demo padre');
    expect(parentField()).toHaveTextContent('Demo padre');

    await user.click(screen.getByRole('radio', { name: /Sistema/ }));

    await waitFor(() => {
      expect(parentField()).toHaveTextContent('Ninguno (módulo de primer nivel)');
    });
  });

  it('creates the module as a submodule: sends parent_module_id and tells the page to expand the parent', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const onCreated = vi.fn();
    const onParentAssigned = vi.fn();
    renderWithProviders(<Harness onCreated={onCreated} onParentAssigned={onParentAssigned} />);
    await waitForOptions();

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'demo_new');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Demo nuevo');
    await choose(user, 'Demo padre');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Módulo creado.')).toBeInTheDocument();
    expect(mock.requestsTo('POST', '/api/v1/modules')[0]?.body).toMatchObject({
      key: 'demo_new',
      parent_module_id: 500,
    });
    expect(onParentAssigned).toHaveBeenCalledWith(500);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('sends no parent_module_id, and expands nothing, when the module has no parent', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const onParentAssigned = vi.fn();
    renderWithProviders(<Harness onParentAssigned={onParentAssigned} />);
    await waitForOptions();

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'inventory');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Inventario');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    await screen.findByText('Módulo creado.');
    expect(mock.requestsTo('POST', '/api/v1/modules')[0]?.body).not.toHaveProperty(
      'parent_module_id',
    );
    expect(onParentAssigned).not.toHaveBeenCalled();
  });

  it('shows the refusal next to the field, keeps what was written and does not call onCreated', async () => {
    const user = userEvent.setup();
    const mock = seed();
    const onCreated = vi.fn();
    renderWithProviders(<Harness onCreated={onCreated} />);
    await waitForOptions();
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'demo_new');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Demo nuevo');
    await choose(user, 'Demo padre');
    // Another session deleted the parent after the options were loaded.
    mock.state.deleteModule(501);
    mock.state.deleteModule(500);

    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(
      await screen.findByText('El módulo padre ya no existe o fue eliminado. Elige otro.'),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Clave' })).toHaveValue('demo_new');
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Demo nuevo');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
