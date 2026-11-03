import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
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

/** The real 23-module catalog plus a parent (500) with an Active submodule (501) and a Blocked one (502). */
function start() {
  const directory = createUsersDirectoryMock(defaultDirectory());
  directory.grant('Administrator', 'modules:read');
  directory.grant('Administrator', 'modules:write');
  directory.grant('Administrator', 'modules:update');
  directory.grant('Administrator', 'modules:delete');
  const modules = createModulesCatalogMock({ directory });
  modules.addModule(
    catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }),
  );
  modules.addModule(
    catalogModule({
      id: 501,
      key: 'demo_child',
      name: 'Demo hija',
      sortOrder: 10,
      parentModuleId: 500,
    }),
  );
  return { directory, modules };
}

const TOTAL = '24 módulos y 1 submódulo activo';

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

type User = ReturnType<typeof open>['user'];

async function openEditFor(user: User, rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

async function closeDialog(user: User) {
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

describe('the modules section: a module with submodules (feature 024, user story 3)', () => {
  it('tells how many submodules would stop being available if the parent is blocked, and offers no way to delete it', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    await openEditFor(user, /^5\s*Demo padre/);

    expect(
      screen.getByText(
        'Si lo bloqueas, 1 submódulo dejará de estar disponible hasta que lo desbloquees; conserva su propio estatus.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar módulo' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Este módulo tiene submódulos. Para eliminarlo, primero elimina sus submódulos o cámbialos de padre.',
      ),
    ).toBeInTheDocument();
  });

  it('refuses to delete a parent whose submodules are not in the list, says why and deletes nothing', async () => {
    const { modules } = start();
    // Blocked: the Active list has no sign of it, so the screen offers to delete the parent.
    modules.state.blockModule(501);
    const { user } = open('/modules');
    await screen.findByText('24 módulos activos');

    await openEditFor(user, /^5\s*Demo padre/);
    await user.click(screen.getByRole('button', { name: 'Eliminar módulo' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText(
        'Este módulo tiene submódulos y no se puede eliminar: primero elimínalos o cámbialos de padre.',
      ),
    ).toBeInTheDocument();
    expect(modules.state.findModule(500)?.statusId).toBe(1);
  });

  it('deletes a submodule as any other module, and its parent, now without submodules, can be deleted', async () => {
    const { modules } = start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    await openEditFor(user, /Demo hija/);
    await user.click(screen.getByRole('button', { name: 'Eliminar módulo' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await screen.findByText('Módulo eliminado.');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('24 módulos activos')).toBeInTheDocument();
    // The parent lost its only submodule: no control to collapse, and it can be deleted.
    expect(
      screen.queryByRole('button', { name: /submódulos? de Demo padre/ }),
    ).not.toBeInTheDocument();
    expect(modules.state.findModule(500)?.statusId).toBe(1);
    await openEditFor(user, /^5\s*Demo padre/);
    expect(screen.getByRole('button', { name: 'Eliminar módulo' })).toBeInTheDocument();
    await closeDialog(user);
  });

  it('blocking a submodule leaves its parent as it was, and the parent shows one submodule fewer', async () => {
    const { modules } = start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    await openEditFor(user, /Demo hija/);
    await user.click(screen.getByRole('button', { name: 'Bloquear módulo' }));
    await screen.findByText('Módulo bloqueado.');
    await screen.findByText('Este módulo ya no existe.');
    // As in blockModule.integration.test.tsx: nothing inside the dialog keeps the focus, so Escape does not reach it.
    const dialog = screen.getByRole('dialog');
    if (dialog.parentElement === null) {
      throw new Error('The dialog has no container to click on');
    }
    await user.click(dialog.parentElement);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('24 módulos activos')).toBeInTheDocument();
    expect(modules.state.findModule(500)?.statusId).toBe(1);
    expect(
      screen.queryByRole('button', { name: /submódulos? de Demo padre/ }),
    ).not.toBeInTheDocument();
  });
});
