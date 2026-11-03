import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

// Same reason as modulesList.integration.test.tsx: the screen is lazy and its first render is slow.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await import('@/features/modules/components/ModulesPage');
}, 90_000);

/** The real 23-module catalog plus a parent with two submodules (feature 024). */
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
      key: 'demo_child_a',
      name: 'Demo hija A',
      sortOrder: 10,
      parentModuleId: 500,
    }),
  );
  modules.addModule(
    catalogModule({
      id: 502,
      key: 'demo_child_b',
      name: 'Demo hija B',
      sortOrder: 20,
      parentModuleId: 500,
    }),
  );
  return { directory, modules };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const TOTAL = '24 módulos y 2 submódulos activos';

function rowTexts(): string[] {
  return screen.getAllByRole('row').map((row) => row.textContent);
}

function outsideOf(dialog: HTMLElement): HTMLElement {
  const container = dialog.parentElement;
  if (container === null) {
    throw new Error('The dialog has no container to click on');
  }
  return container;
}

/** Same helper as blockModule.integration.test.tsx: the status change moves the module out of the view. */
async function closeDialog(user: ReturnType<typeof open>['user']) {
  await screen.findByText('Este módulo ya no existe.');
  await user.click(outsideOf(screen.getByRole('dialog')));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

describe('the modules section as a tree (feature 024, user story 1)', () => {
  it('shows each submodule right under its parent and tells modules and submodules apart', async () => {
    start();
    open('/modules');

    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    const texts = rowTexts();
    const parentAt = texts.findIndex((text) => text.includes('Demo padre'));
    expect(parentAt).toBeGreaterThan(-1);
    expect(texts[parentAt + 1]).toContain('Demo hija A');
    expect(texts[parentAt + 2]).toContain('Demo hija B');
    expect(
      screen.getByRole('rowheader', {
        name: /Clínica, aplicación para clínicas · 16 módulos y 2 submódulos/,
      }),
    ).toBeInTheDocument();
  });

  it('collapses and expands the submodules of a parent, which start expanded', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);
    const toggle = screen.getByRole('button', { name: '2 submódulos de Demo padre' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);

    expect(screen.queryByRole('row', { name: /Demo hija A/ })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(await screen.findByRole('row', { name: /Demo hija A/ })).toBeInTheDocument();
  });

  it('keeps the parent when a search matches only a submodule, and restores the collapsed state afterwards', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);
    await user.click(screen.getByRole('button', { name: '2 submódulos de Demo padre' }));

    await user.type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'demo_child_a');

    expect(await screen.findByRole('row', { name: /Demo hija A/ })).toBeInTheDocument();
    expect(screen.getByText('Su submódulo coincide con la búsqueda')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Demo hija B/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submódulos de Demo padre/ }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: 'Nombre o clave' }));

    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Demo hija A/ })).not.toBeInTheDocument();
  });

  it('never separates a submodule from its parent when filtering by type', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    await user.click(screen.getByRole('button', { name: 'Sistema' }));

    expect(screen.queryByRole('row', { name: /Demo/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clínica' }));

    expect(await screen.findByRole('row', { name: /Demo hija A/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^5\s*Demo padre/ })).toBeInTheDocument();
  });

  it('shows a Blocked submodule of an Active parent under a context row of the parent', async () => {
    const { modules } = start();
    modules.state.blockModule(501);
    const { user } = open('/modules');
    await screen.findByText('24 módulos y 1 submódulo activo');

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    const row = await screen.findByRole('row', { name: /Demo hija A/ });
    expect(within(row).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByText('Está en «Activos»')).toBeInTheDocument();
    expect(screen.getByText('0 módulos y 1 submódulo bloqueado')).toBeInTheDocument();
  });

  it('takes a blocked parent and its Active submodules out of Activos, and brings them back when it is unblocked', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    const parentRow = screen.getByRole('row', { name: /^5\s*Demo padre/ });
    await user.click(within(parentRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Bloquear módulo' }));
    await screen.findByText('Módulo bloqueado.');
    await closeDialog(user);

    expect(screen.getByText('23 módulos activos')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Demo/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));
    const blockedRow = await screen.findByRole('row', { name: /^5\s*Demo padre/ });
    expect(screen.getByText('1 módulo bloqueado')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Demo hija/ })).not.toBeInTheDocument();

    await user.click(within(blockedRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Desbloquear módulo' }));
    await screen.findByText('Módulo desbloqueado.');
    await closeDialog(user);

    await user.click(screen.getByRole('button', { name: 'Activos' }));
    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /Demo hija B/ })).toBeInTheDocument();
  });
});
