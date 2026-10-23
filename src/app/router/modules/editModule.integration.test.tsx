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

const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

async function openEditFor(user: ReturnType<typeof open>['user'], rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

describe('the modules section: editing (feature 013, user story 3)', () => {
  it('changes description and order while key and type stay fixed (W10)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await openEditFor(user, /Agenda y citas/);
    expect(screen.getByRole('heading', { name: 'Editar módulo' })).toBeInTheDocument();
    expect(screen.getByText('La clave y el tipo no cambian nunca.')).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: 'Descripción' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Agenda compartida por consultorio.',
    );
    await user.clear(screen.getByRole('textbox', { name: 'Orden' }));
    await user.type(screen.getByRole('textbox', { name: 'Orden' }), '25');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    const row = await screen.findByRole('row', { name: /Agenda y citas/ });
    expect(row).toHaveTextContent('25');
  });

  it('marks a new action right away in the row (W11)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // "Recordatorios" starts with Ver y Modificar only.
    await openEditFor(user, /Recordatorios/);
    await user.click(screen.getByRole('checkbox', { name: /Crear/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');

    const row = await screen.findByRole('row', { name: /Recordatorios/ });
    expect(row).toHaveTextContent('Crear');
  });

  it('unmarks an action already had, after confirming, and it disappears from the row (W12)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await openEditFor(user, /Agenda y citas/);
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Eliminar');
    expect(dialog).toHaveTextContent('Agenda y citas');
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await noDialog();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');

    const row = await screen.findByRole('row', { name: /Agenda y citas/ });
    expect(row).not.toHaveTextContent('Eliminar');
  });

  it('lets the base module "users" change its name, description and order like any other (W13)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await openEditFor(user, /Usuarios/);
    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Usuarios del sistema');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /Usuarios del sistema/ })).toBeInTheDocument();
  });
});
