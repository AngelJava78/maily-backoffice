import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await import('@/features/modules/components/ModulesPage');
}, 90_000);

function start() {
  const directory = createUsersDirectoryMock(defaultDirectory());
  directory.grant('Administrator', 'modules:read');
  directory.grant('Administrator', 'modules:write');
  directory.grant('Administrator', 'modules:update');
  directory.grant('Administrator', 'modules:delete');
  return { directory, modules: createModulesCatalogMock({ directory }) };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

async function openEditFor(user: ReturnType<typeof open>['user'], rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

describe('the modules section: deleting (feature 013, user story 5)', () => {
  it('offers no way to delete one of the four base modules, with an explanation (W15)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // Not /Permisos/: that text also names the table's own "Permisos" column header.
    await openEditFor(user, /permissions/);

    expect(screen.queryByRole('button', { name: 'Eliminar módulo' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Los módulos base de administración (Usuarios, Roles, Permisos y Módulos) no se pueden bloquear ni eliminar.',
      ),
    ).toBeInTheDocument();
  });

  it('deletes a module with one action already assigned to a role, closes the panel, and frees its key (W16)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // A pre-seeded module ("reminders"/Recordatorios) instead of one created by US2's own flow, so
    // this test is self-contained; FR-022 does not require the module to be free of role
    // assignments for the deletion to go through.
    await openEditFor(user, /Recordatorios/);
    await user.click(screen.getByRole('button', { name: 'Eliminar módulo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar módulo' });
    expect(dialog).toHaveTextContent('Recordatorios');
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await screen.findByText('Módulo eliminado.');
    // Deleting calls `onDeleted` (`closePanel`): both the confirmation and the edit modal close.
    await noDialog();

    expect(screen.queryByRole('row', { name: /Recordatorios/ })).not.toBeInTheDocument();
    expect(screen.getByText('22 módulos activos')).toBeInTheDocument();

    // The key is free again: a new module can reuse it.
    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.click(screen.getByRole('radio', { name: /Clínica/ }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'reminders');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Recordatorios de nuevo');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Módulo creado.')).toBeInTheDocument();
  });
});
