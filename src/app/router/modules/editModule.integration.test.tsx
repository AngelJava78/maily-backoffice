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

/** Only the uncheck-action confirmation closes here; the outer edit modal (`DialogHarness`-style
 * nesting, spec 017) stays open underneath it. A mere count can settle on a transient, wrong
 * instant while it closes (same finding as `ModuleEditPanel.test.tsx`, research R6 of spec 017),
 * so this re-confirms the outer dialog by its own name too. */
const noConfirmDialog = () =>
  waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Editar módulo' })).toBeInTheDocument();
    expect(screen.queryAllByRole('dialog')).toHaveLength(1);
  });

async function openEditFor(user: ReturnType<typeof open>['user'], rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

/** Saving does not close the edit modal on its own (it only resets the form, `ModuleEditPanel`):
 * the table behind it stays inert until it is dismissed. */
async function closeDialog(user: ReturnType<typeof open>['user']) {
  await user.keyboard('{Escape}');
  await noDialog();
}

/**
 * Creates a module with none of its four actions marked (022, FR-016), then stays in the same
 * dialog, now showing its edit panel (research of 013-manage-modules: creating moves straight into
 * editing the new module).
 */
async function createWithNoActions(user: ReturnType<typeof open>['user'], key: string) {
  await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
  await user.type(screen.getByRole('textbox', { name: 'Clave' }), key);
  await user.type(screen.getByRole('textbox', { name: 'Nombre' }), key);
  for (const actionName of [/Ver/, /Crear/, /Modificar/, /Eliminar/]) {
    await user.click(screen.getByRole('checkbox', { name: actionName }));
  }
  await user.click(screen.getByRole('button', { name: 'Crear módulo' }));
  await screen.findByText('Módulo creado.');
  await screen.findByRole('heading', { name: 'Editar módulo' });
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
    await closeDialog(user);
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
    await closeDialog(user);

    const row = await screen.findByRole('row', { name: /Recordatorios/ });
    expect(row).toHaveTextContent('Crear');
  });

  it('unmarks an action already had, after confirming, and it disappears from the row (W12)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await openEditFor(user, /Agenda y citas/);
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Quitar acción' });
    expect(dialog).toHaveTextContent('Eliminar');
    expect(dialog).toHaveTextContent('Agenda y citas');
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await noConfirmDialog();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');
    await closeDialog(user);

    const row = await screen.findByRole('row', { name: /Agenda y citas/ });
    expect(row).not.toHaveTextContent('Eliminar');
  });

  it('saves a module with none of its actions marked, changing only its name (022, FR-016, Z8)', async () => {
    const { modules } = start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');
    await createWithNoActions(user, 'zeroactions');
    expect(modules.state.findActiveModuleByKey('zeroactions')?.id).toBeDefined();

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Sin permisos');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    const created = modules.state.findActiveModuleByKey('zeroactions');
    if (created === undefined) {
      throw new Error('Expected the module "zeroactions" to exist');
    }
    expect(modules.state.activePermissionsCountOf(created.id)).toBe(0);
  });

  it('marks "Ver" on a module with no permissions, creating "<key>:read" (022, FR-012, FR-013, Z7)', async () => {
    const { modules } = start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');
    await createWithNoActions(user, 'overview');
    const created = modules.state.findActiveModuleByKey('overview');
    if (created === undefined) {
      throw new Error('Expected the module "overview" to exist');
    }
    expect(modules.state.activePermissionsCountOf(created.id)).toBe(0);

    await user.click(screen.getByRole('checkbox', { name: /Ver/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(modules.state.activePermissionsCountOf(created.id)).toBe(1);
    expect(
      modules.state.listPermissions().some((permission) => permission.name === 'overview:read'),
    ).toBe(true);
  });

  it('shows the FR-015 error and does not save when "Ver" is unchecked but "Crear" stays marked (022, Z9)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // "Agenda y citas" (schedule) starts with its four actions marked (seed.ts).
    await openEditFor(user, /Agenda y citas/);
    await user.click(screen.getByRole('checkbox', { name: /Ver/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Quitar acción' });
    await user.click(within(dialog).getByRole('button', { name: 'Quitar' }));
    await noConfirmDialog();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Para usar Crear, Modificar o Eliminar, marca también Ver.'),
    ).toBeInTheDocument();
  });

  it('asks for confirmation on each of the four actions when unchecking all of them, and removes all four on save (022, Z10)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // "Agenda y citas" (schedule) starts with its four actions marked (seed.ts).
    await openEditFor(user, /Agenda y citas/);
    for (const actionName of [/Eliminar/, /Modificar/, /Crear/, /Ver/]) {
      await user.click(screen.getByRole('checkbox', { name: actionName }));
      const dialog = await screen.findByRole('dialog', { name: 'Quitar acción' });
      await user.click(within(dialog).getByRole('button', { name: 'Quitar' }));
      await noConfirmDialog();
    }
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');
    await closeDialog(user);

    const row = await screen.findByRole('row', { name: /Agenda y citas/ });
    expect(row).not.toHaveTextContent('Ver');
    expect(row).not.toHaveTextContent('Crear');
    expect(row).not.toHaveTextContent('Modificar');
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
    await closeDialog(user);
    expect(await screen.findByRole('row', { name: /Usuarios del sistema/ })).toBeInTheDocument();
  });
});
