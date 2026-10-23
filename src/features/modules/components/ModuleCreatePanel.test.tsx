import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';

import { ModuleCreatePanel } from './ModuleCreatePanel';

function renderPanel(
  options: { readonly onCreated?: (moduleId: number) => void; readonly onCancel?: () => void } = {},
) {
  return renderWithProviders(
    <ModuleCreatePanel
      nextSortOrder={160}
      onCreated={options.onCreated ?? vi.fn()}
      onCancel={options.onCancel ?? vi.fn()}
    />,
  );
}

describe('ModuleCreatePanel', () => {
  it('shows Tipo as two cards, Clave with its help, and the four actions marked by default', () => {
    createModulesCatalogMock();
    renderPanel();

    expect(screen.getByRole('radio', { name: /Sistema/ })).toBeInTheDocument();
    const clinic = screen.getByRole('radio', { name: /Clínica/ });
    expect(clinic).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Clave' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'No se puede cambiar después. Un módulo de Clínica solo se da a roles de Clínica.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Ver/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Crear/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Modificar/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Eliminar/ })).toBeChecked();
  });

  it('shows the permission names under the typed key as it is written', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    renderPanel();

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'inventory');

    expect(screen.getByText('inventory:read')).toBeInTheDocument();
  });

  it('creates the module with the actions marked and calls onCreated (W6)', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    const onCreated = vi.fn();
    renderPanel({ onCreated });

    await user.click(screen.getByRole('radio', { name: /Sistema/ }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'audit');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Auditoría');
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Módulo creado.')).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
    const created = mock.state.findActiveModuleByKey('audit');
    expect(created?.typeId).toBe(1);
    expect(mock.requestsTo('POST', '/api/v1/permissions').map((request) => request.body)).toEqual([
      { name: 'audit:read' },
      { name: 'audit:write' },
      { name: 'audit:update' },
    ]);
  });

  it('shows the key conflict on the Clave field and does not call onCreated (W7)', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    mock.state.addModule({
      id: 99,
      key: 'inventory',
      name: 'Inventario',
      description: null,
      sortOrder: 10,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
    });
    const onCreated = vi.fn();
    renderPanel({ onCreated });

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'inventory');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Otro');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Ya existe un módulo con esa clave.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('explains the key format before trying to save (W8)', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    renderPanel();

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'Inventory');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Inventario');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(
      await screen.findByText(
        'Usa minúsculas, números y guion bajo, empezando con una letra (hasta 50 caracteres).',
      ),
    ).toBeInTheDocument();
  });

  it('reports which action was not saved and still moves to editing it (research D11)', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    // Someone else already created this exact permission (simulated race): a business-level
    // conflict for "Modificar" alone, the other actions still go through.
    mock.state.createPermission({ name: 'inventory:update' });
    const onCreated = vi.fn();
    renderPanel({ onCreated });

    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'inventory');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Inventario');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(
      await screen.findByText(
        'Módulo creado, pero no se pudo marcar: Modificar. Puedes reintentarlo desde Editar.',
      ),
    ).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancelar is pressed', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const onCancel = vi.fn();
    renderPanel({ onCancel });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    createModulesCatalogMock();
    const { container } = renderPanel();

    expect(await axe(container)).toHaveNoViolations();
  });
});
