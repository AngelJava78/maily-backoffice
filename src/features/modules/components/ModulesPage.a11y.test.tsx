import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ModulesPage } from './ModulesPage';

const FULL_ACCESS = {
  canCreate: true,
  canEdit: true,
  canBlock: true,
  canUnblock: true,
  canDelete: true,
};

/** The real 23-module catalog plus a parent (500) with two submodules (501, 502). */
function withHierarchy() {
  const mock = createModulesCatalogMock();
  mock.addModule(catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }));
  mock.addModule(
    catalogModule({
      id: 501,
      key: 'demo_child_a',
      name: 'Demo hija A',
      sortOrder: 10,
      parentModuleId: 500,
    }),
  );
  mock.addModule(
    catalogModule({
      id: 502,
      key: 'demo_child_b',
      name: 'Demo hija B',
      sortOrder: 20,
      parentModuleId: 500,
    }),
  );
  return mock;
}

const TOTAL = '24 módulos y 2 submódulos activos';

function renderPage() {
  return renderWithProviders(<ModulesPage capabilities={FULL_ACCESS} />, { route: '/modules' });
}

const parentToggle = () => screen.getByRole('button', { name: '2 submódulos de Demo padre' });
const rowOf = (name: RegExp) => screen.getByRole('row', { name });
const editOf = (name: RegExp) => within(rowOf(name)).getByRole('button', { name: 'Editar' });

describe('ModulesPage as a tree: keyboard and screen reader (spec 024, user story 4)', () => {
  it('reaches the collapse control of a parent and the "Editar" of every row with Tab, in reading order', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);
    const user = userEvent.setup();

    parentToggle().focus();
    await user.tab();
    expect(editOf(/^5\s*Demo padre/)).toHaveFocus();

    await user.tab();
    expect(editOf(/Demo hija A/)).toHaveFocus();

    await user.tab();
    expect(editOf(/Demo hija B/)).toHaveFocus();
  });

  it('keeps the focus on the control when it collapses and expands, and the next Tab goes to the next row that is painted', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);
    const user = userEvent.setup();

    parentToggle().focus();
    await user.keyboard('{Enter}');

    expect(parentToggle()).toHaveFocus();
    expect(parentToggle()).toHaveAttribute('aria-expanded', 'false');
    await user.tab();
    expect(editOf(/^5\s*Demo padre/)).toHaveFocus();
    await user.tab();
    // The submodules are gone: the next stop is whatever comes after them in the page.
    expect(screen.queryByRole('row', { name: /Demo hija/ })).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
  });

  it('still reaches every "Editar" with Tab during a search, where the collapse control is not offered', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'demo_child');
    await screen.findByText('Su submódulo coincide con la búsqueda');

    expect(
      screen.queryByRole('button', { name: /submódulos de Demo padre/ }),
    ).not.toBeInTheDocument();
    editOf(/Demo hija A/).focus();
    await user.tab();
    expect(editOf(/Demo hija B/)).toHaveFocus();
  });

  it('says whose submodule each one is, before its name, and the parent name in the control of the parent', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);

    const child = rowOf(/Demo hija A/);
    const hint = within(child).getByText('Submódulo de Demo padre');
    const name = within(child).getByText('Demo hija A');
    // The hint is the first thing inside the name: it is read before it.
    expect(name.firstElementChild).toBe(hint);
    expect(parentToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(parentToggle()).toHaveTextContent('2 submódulos');
  });

  it('reads a context row with its notice, and offers no control on it', async () => {
    const mock = withHierarchy();
    mock.state.blockModule(501);
    renderPage();
    await screen.findByText('24 módulos y 1 submódulo activo');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    const context = await screen.findByText('Está en «Activos»');
    const row = context.closest('tr');
    expect(row).not.toBeNull();
    if (row !== null) {
      expect(within(row).getByText('Demo padre')).toBeVisible();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('has no axe violations with the tree collapsed, and during a search with a context row', async () => {
    withHierarchy();
    const { container } = renderPage();
    await screen.findByText(TOTAL);
    const user = userEvent.setup();

    await user.click(parentToggle());
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /Demo hija/ })).not.toBeInTheDocument();
    });
    expect(await axe(container)).toHaveNoViolations();

    await user.type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'demo_child_a');
    await screen.findByText('Su submódulo coincide con la búsqueda');
    expect(await axe(container)).toHaveNoViolations();
  });
});
