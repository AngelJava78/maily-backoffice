import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import { ADMIN_SUB, createUsersDirectoryMock, defaultDirectory } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

/** The operator with the four `modules:*` permissions, and the real 23-module catalog. */
function start() {
  const directory = createUsersDirectoryMock(defaultDirectory());
  directory.grant('Administrator', 'modules:read');
  directory.grant('Administrator', 'modules:write');
  directory.grant('Administrator', 'modules:update');
  directory.grant('Administrator', 'modules:delete');
  const modules = createModulesCatalogMock({ directory });
  return { directory, modules };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

describe('the modules section: consulting (feature 013, user story 1)', () => {
  it('lists the section in the navigation, first, and opens the catalog from it (W1)', async () => {
    start();
    const { user } = open('/');

    const navigation = await screen.findByRole('navigation', { name: messages.nav.label });
    const links = within(navigation).getAllByRole('link');
    expect(links[0]).toHaveAccessibleName(messages.nav.sections.modules);
    await user.click(within(navigation).getByRole('link', { name: messages.nav.sections.modules }));

    expect(await screen.findByText('23 módulos activos')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: messages.modules.title }),
    ).toBeInTheDocument();
    expect(document.title).toBe(`${messages.titles.modules} — ${messages.common.appName}`);
  });

  it('filters by Tipo and searches by key (W2, W3 parcial, W4)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(screen.getByText('Sistema, pantallas del Backoffice · 8 módulos')).toBeInTheDocument();
    expect(screen.queryByText(/Clínica, aplicación para clínicas/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'appointments');
    expect(await screen.findByRole('row', { name: /Agenda y citas/ })).toBeInTheDocument();
  });

  it('shows "no hay módulos bloqueados" with the Bloqueados filter and nothing blocked (W3)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    expect(await screen.findByText('No hay módulos bloqueados.')).toBeInTheDocument();
  });

  it('hides the section from an operator without modules:read, and sends them home with a notice (W5)', async () => {
    const { directory } = start();
    directory.revoke('Administrator', 'modules:read');
    const { router } = open('/modules');

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    expect(
      within(navigation).queryByRole('link', { name: messages.nav.sections.modules }),
    ).not.toBeInTheDocument();
  });
});
