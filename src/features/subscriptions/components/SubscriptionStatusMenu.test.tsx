import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionStatusMenu } from './SubscriptionStatusMenu';

const text = messages.subscriptions;
const STATUS_PATH = (id: number) => `/api/v1/subscriptions/${id}/status`;

function start() {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  catalog.addStatus(5, 'En revisión');
  catalog.setStatus(4, 5);
  return catalog;
}

/** What the detail does with the menu: it reads the subscription and hands it over. */
function Harness({ id }: { readonly id: number }) {
  const query = useSubscription(id);
  if (query.data === undefined) {
    return null;
  }
  return (
    <>
      <p data-testid="status">{query.data.status.name}</p>
      <SubscriptionStatusMenu subscription={query.data} />
    </>
  );
}

function renderMenu(id = 2) {
  return renderWithProviders(<Harness id={id} />, { auth0: ADMIN_AUTH0 });
}

type Rendered = ReturnType<typeof renderMenu>;

// A button that is loading keeps its text, but it may not be its whole name.
const menuButton = () =>
  screen.getByRole('button', { name: new RegExp(text.actions.changeStatus) });
const statusText = () => screen.getByTestId('status').textContent;

async function openMenu(user: Rendered['user']) {
  await user.click(await screen.findByRole('button', { name: text.actions.changeStatus }));
  return screen.findByRole('menu');
}

async function choose(user: Rendered['user'], verb: string) {
  const menu = await openMenu(user);
  await user.click(within(menu).getByRole('menuitem', { name: verb }));
}

async function noDialog() {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

describe('SubscriptionStatusMenu: what it offers', () => {
  it('opens a menu from «Cambiar estatus»', async () => {
    start();
    const { user } = renderMenu();

    const menu = await openMenu(user);

    // While the menu is open, the rest of the page is hidden from assistive technologies.
    const button = screen.getByRole('button', { name: text.actions.changeStatus, hidden: true });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveAccessibleName(text.actions.changeStatus);
  });

  it.each([
    [2, [text.statusTargets.inactivate, text.statusTargets.block]],
    [7, [text.statusTargets.activate, text.statusTargets.inactivate]],
    [5, [text.statusTargets.activate, text.statusTargets.block]],
    [4, [text.statusTargets.activate, text.statusTargets.inactivate, text.statusTargets.block]],
  ])('offers, for the subscription %i, the statuses that it does not have', async (id, verbs) => {
    start();
    const { user } = renderMenu(id);

    const menu = await openMenu(user);

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(verbs);
  });
});

describe('SubscriptionStatusMenu: inactivating and blocking', () => {
  it('asks first, naming the subscription and the new status, with the focus on «Cancelar»', async () => {
    start();
    const { user } = renderMenu();

    await choose(user, text.statusTargets.inactivate);

    const dialog = await screen.findByRole('dialog', { name: text.dialogs.inactivate.title });
    expect(dialog).toHaveTextContent(text.dialogs.inactivate.body('Pro'));
    expect(dialog).toHaveTextContent('Inactiva');
    expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toHaveFocus();
  });

  it('inactivates once confirmed, and tells it after the dialog has closed', async () => {
    const catalog = start();
    const { user } = renderMenu();
    await choose(user, text.statusTargets.inactivate);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.inactivate.confirm }));

    await noDialog();
    expect(await screen.findByText(text.statusNotices.inactivated)).toBeInTheDocument();
    expect(catalog.requestsTo('PATCH', STATUS_PATH(2))[0]?.body).toEqual({ status_id: 2 });
    expect(statusText()).toBe('Inactiva');
  });

  it('blocks with the dangerous variant, once confirmed', async () => {
    const catalog = start();
    const { user } = renderMenu();
    await choose(user, text.statusTargets.block);

    const dialog = await screen.findByRole('dialog', { name: text.dialogs.block.title });
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.block.confirm });
    expect(confirm).toHaveClass('MuiButton-colorError');
    await user.click(confirm);

    expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
    expect(catalog.requestsTo('PATCH', STATUS_PATH(2))[0]?.body).toEqual({ status_id: 3 });
  });

  it('sends nothing when it is cancelled', async () => {
    const catalog = start();
    const { user } = renderMenu();
    await choose(user, text.statusTargets.block);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    await noDialog();
    expect(catalog.requestsTo('PATCH', STATUS_PATH(2))).toHaveLength(0);
    expect(statusText()).toBe('Activa');
  });

  it('sends one request however many times it is confirmed while it works', async () => {
    const catalog = start();
    const { user } = renderMenu();
    await choose(user, text.statusTargets.inactivate);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.inactivate.confirm });
    const release = catalog.defer();

    await user.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    });
    release();
    expect(await screen.findByText(text.statusNotices.inactivated)).toBeInTheDocument();
    expect(catalog.requestsTo('PATCH', STATUS_PATH(2))).toHaveLength(1);
    expect(screen.queryByText(text.errors.statusUnchanged)).not.toBeInTheDocument();
  });

  it('warns when another person already gave it that status, and shows the status it has (US4-7)', async () => {
    const catalog = start();
    const { user } = renderMenu();
    await screen.findByTestId('status');
    catalog.setStatus(2, 2);
    await choose(user, text.statusTargets.inactivate);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: text.dialogs.inactivate.confirm }));

    const notice = await screen.findByText(text.errors.statusUnchanged);
    expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorWarning');
    expect(statusText()).toBe('Inactiva');
  });
});

describe('SubscriptionStatusMenu: activating', () => {
  it('activates without asking, with the button pending, and tells it', async () => {
    const catalog = start();
    const { user } = renderMenu(7);
    await screen.findByTestId('status');
    const release = catalog.defer();

    await choose(user, text.statusTargets.activate);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(menuButton()).toBeDisabled();
    });
    release();
    expect(await screen.findByText(text.statusNotices.activated)).toBeInTheDocument();
    expect(catalog.requestsTo('PATCH', STATUS_PATH(7))[0]?.body).toEqual({ status_id: 1 });
    await waitFor(() => {
      expect(statusText()).toBe('Activa');
    });
  });
});

describe('SubscriptionStatusMenu: the keyboard and the accessibility', () => {
  it('is operated with the keyboard, and the focus goes back to the button', async () => {
    start();
    const { user } = renderMenu();
    (await screen.findByRole('button', { name: text.actions.changeStatus })).focus();

    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: text.statusTargets.inactivate }),
    ).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: text.statusTargets.block })).toHaveFocus();
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    expect(menuButton()).toHaveFocus();
  });

  it('opens the confirmation with Enter on an option', async () => {
    start();
    const { user } = renderMenu();
    (await screen.findByRole('button', { name: text.actions.changeStatus })).focus();

    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('dialog', { name: text.dialogs.inactivate.title }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations with the menu open and with the dialog open', async () => {
    start();
    const { user, baseElement } = renderMenu();

    // The menu is a popup that MUI renders apart from the landmarks of the page, so it is checked
    // on its own; the dialog, as a dialog, is checked with the whole page.
    expect(await axe(await openMenu(user))).toHaveNoViolations();

    await user.click(screen.getByRole('menuitem', { name: text.statusTargets.block }));
    await screen.findByRole('dialog');
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
