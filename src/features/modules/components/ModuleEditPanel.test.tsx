import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';
import { renderWithProviders } from '@/test/renderWithProviders';
import { createModulesCatalogMock, USERS_API_BASE_URL, type ModulesCatalogMock } from '@/test/handlers/modulesCatalog';

import { listModules } from '../api/modulesApi';
import type { SystemModule } from '../schemas/systemModule';
import { ModuleEditPanel } from './ModuleEditPanel';

function client() {
  return createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:admin'),
    onSessionExpired: () => undefined,
  });
}

/** "Expediente clínico": has read/write/update but not delete, so a test can both mark a new
 * action and unmark one it already has. */
async function medicalRecords(): Promise<SystemModule> {
  const found = (await listModules(client())).find((candidate) => candidate.key === 'medical_records');
  if (found === undefined) {
    throw new Error('setup error: missing the medical_records module');
  }
  return found;
}

async function usersModule(): Promise<SystemModule> {
  const found = (await listModules(client())).find((candidate) => candidate.key === 'users');
  if (found === undefined) {
    throw new Error('setup error: missing the users module');
  }
  return found;
}

function renderPanel(module: SystemModule) {
  return renderWithProviders(<ModuleEditPanel module={module} />);
}

/** MUI keeps the dialog's node mounted through its exit transition: only once it is gone does the
 * rest of the page stop being `aria-hidden` (same pattern as `UserRolesPanel.actions.test.tsx`). */
const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

describe('ModuleEditPanel', () => {
  it('shows Clave and Tipo as fixed information, never as editable fields', async () => {
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    expect(screen.getByText('medical_records')).toBeInTheDocument();
    expect(screen.getByText('Clínica')).toBeInTheDocument();
    expect(screen.getByText('La clave y el tipo no cambian nunca.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Clave' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('opens with the current values of the module', async () => {
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Expediente clínico');
    expect(screen.getByRole('checkbox', { name: /Ver/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Crear/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Modificar/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Eliminar/ })).not.toBeChecked();
  });

  it('marks a new action right away, without asking anything', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));

    expect(screen.getByRole('checkbox', { name: /Eliminar/ })).toBeChecked();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to confirm before unmarking an action the module already had, naming it and the module (FR-017)', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Modificar');
    expect(dialog).toHaveTextContent('Expediente clínico');
    // Nothing applied yet: the checkbox still shows checked until confirmed. It is `aria-hidden`
    // behind the open dialog (MUI inerts the rest of the page), hence `hidden: true` to still find it.
    expect(screen.getByRole('checkbox', { name: /Modificar/, hidden: true })).toBeChecked();
  });

  it('leaves everything unchanged when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await noDialog();

    expect(screen.getByRole('checkbox', { name: /Modificar/ })).toBeChecked();
  });

  it('unmarks the action once the confirmation is accepted', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await noDialog();

    expect(screen.getByRole('checkbox', { name: /Modificar/ })).not.toBeChecked();
  });

  it('saves the PATCH and the action changes, in sequence, and notifies success (W10, W11, W12)', async () => {
    const user = userEvent.setup();
    const mock: ModulesCatalogMock = createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.clear(screen.getByRole('textbox', { name: 'Descripción' }));
    await user.type(screen.getByRole('textbox', { name: 'Descripción' }), 'Historia clínica completa.');
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await noDialog();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)[0]?.body).toEqual({
      description: 'Historia clínica completa.',
    });
    expect(mock.requestsTo('POST', '/api/v1/permissions').map((request) => request.body)).toEqual([
      { name: 'medical_records:delete' },
    ]);
    const updatePermissionId = module.permissionIdByAction.get('update');
    expect(mock.requestsTo('DELETE', `/api/v1/permissions/${updatePermissionId}`)).toHaveLength(1);
  });

  it('sends no PATCH when only the actions changed', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText('Cambios guardados.');
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)).toHaveLength(0);
  });

  it('reports which action could not be applied and keeps the rest (research D11)', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    const module = await medicalRecords();
    // Someone else already created this exact permission (simulated race).
    mock.state.createPermission({ name: 'medical_records:delete' });
    renderPanel(module);

    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Cambios guardados, pero no se pudo aplicar: Eliminar. Puedes reintentarlo.'),
    ).toBeInTheDocument();
  });

  it('discards every change back to the current values without saving', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    renderPanel(module);

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Otro nombre');
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Expediente clínico');
    expect(screen.getByRole('checkbox', { name: /Eliminar/ })).not.toBeChecked();
  });

  it('lets the base module "users" change its name, description and order like any other (FR-014)', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    const module = await usersModule();
    renderPanel(module);

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Usuarios del sistema');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(mock.requestsTo('PATCH', `/api/v1/modules/${module.id}`)[0]?.body).toEqual({
      name: 'Usuarios del sistema',
    });
  });

  it('shows the key conflict on the Nombre field without applying any action change', async () => {
    const user = userEvent.setup();
    const mock = createModulesCatalogMock();
    mock.state.addModule({
      id: 999,
      key: 'billing_extra',
      name: 'Ya existe',
      description: null,
      sortOrder: 200,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
    });
    const module = await medicalRecords();
    renderPanel(module);

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Ya existe');
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ya existe un módulo con ese nombre.')).toBeInTheDocument();
    expect(mock.requestsTo('POST', '/api/v1/permissions')).toHaveLength(0);
  });

  it('has no axe violations, including with the confirmation dialog open', async () => {
    const user = userEvent.setup();
    createModulesCatalogMock();
    const module = await medicalRecords();
    const { container } = renderPanel(module);

    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
