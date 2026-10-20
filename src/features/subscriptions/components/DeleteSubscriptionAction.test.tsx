import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionKeys } from '../hooks/subscriptionKeys';
import { useSubscription } from '../hooks/useSubscription';
import { DeleteSubscriptionAction } from './DeleteSubscriptionAction';

const text = messages.subscriptions;
const PATH = (id: number) => `/api/v1/subscriptions/${id}`;

function start() {
  return createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
}

/** What the detail does with the action: it reads the subscription and hands it over. */
function Harness({ id }: { readonly id: number }) {
  const query = useSubscription(id);
  if (query.data === undefined) {
    return null;
  }
  return (
    <>
      <p data-testid="clinics">{String(query.data.clinicsCount)}</p>
      <DeleteSubscriptionAction subscription={query.data} />
    </>
  );
}

function ListProbe() {
  return <p>{`Listado ${useLocation().search}`}</p>;
}

function renderAction(id = 2, state?: unknown) {
  const pathname = `/subscriptions/${id}`;
  return renderWithProviders(
    [
      { path: '/subscriptions/:subscriptionId', element: <Harness id={id} /> },
      { path: '/subscriptions', element: <ListProbe /> },
    ],
    { auth0: ADMIN_AUTH0, initialEntries: [state === undefined ? pathname : { pathname, state }] },
  );
}

type Rendered = ReturnType<typeof renderAction>;

const deleteButton = () =>
  screen.getByRole('button', { name: new RegExp(`^${text.actions.delete}`) });

async function openDialog(user: Rendered['user']) {
  await user.click(await screen.findByRole('button', { name: text.actions.delete }));
  return screen.findByRole('dialog', { name: text.dialogs.delete.title });
}

async function confirmIn(user: Rendered['user'], dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));
}

describe('DeleteSubscriptionAction: when it cannot be deleted', () => {
  it.each([
    [1, 2, 'Tiene 2 clínicas asignadas'],
    [3, 1, 'Tiene 1 clínica asignada'],
  ])(
    'is disabled for the subscription %i, with %i clinics, and says why',
    async (id, _clinics, reason) => {
      start();
      renderAction(id);

      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(deleteButton()).toBeDisabled();
      expect(deleteButton()).toHaveAccessibleDescription(reason);
    },
  );
});

describe('DeleteSubscriptionAction: deleting', () => {
  it('is offered when the clinics are not known: the platform decides', async () => {
    const catalog = start();
    catalog.clinics.unavailable();
    renderAction(2);

    await screen.findByText('null');
    expect(deleteButton()).toBeEnabled();
  });

  it('asks first, naming the subscription and saying that it cannot be undone', async () => {
    start();
    const { user } = renderAction();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent(text.dialogs.delete.body('Pro'));
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.delete.confirm });
    expect(confirm).toHaveClass('MuiButton-colorError');
    expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toHaveFocus();
  });

  it('sends nothing when it is cancelled', async () => {
    const catalog = start();
    const { user } = renderAction();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(catalog.requestsTo('DELETE', PATH(2))).toHaveLength(0);
  });

  it('deletes it once confirmed, goes back to the list it came from and says so', async () => {
    const catalog = start();
    const { user, queryClient } = renderAction(2, { listSearch: '?page=2' });
    const dialog = await openDialog(user);

    await confirmIn(user, dialog);

    expect(await screen.findByText('Listado ?page=2')).toBeInTheDocument();
    expect(await screen.findByText(text.notices.deleted)).toBeInTheDocument();
    expect(catalog.state.find(2)).toBeUndefined();
    await waitFor(() => {
      expect(queryClient.getQueryState(subscriptionKeys.detail(2))).toBeUndefined();
    });
  });

  it('sends one request however many times it is confirmed while it works', async () => {
    const catalog = start();
    const { user } = renderAction();
    const dialog = await openDialog(user);
    const confirm = within(dialog).getByRole('button', { name: text.dialogs.delete.confirm });
    const release = catalog.defer();

    await user.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    });
    release();
    expect(await screen.findByText(text.notices.deleted)).toBeInTheDocument();
    expect(catalog.requestsTo('DELETE', PATH(2))).toHaveLength(1);
    expect(screen.queryByText(text.errors.notFound)).not.toBeInTheDocument();
  });
});

describe('DeleteSubscriptionAction: when the platform refuses', () => {
  it('warns when clinics were assigned meanwhile, and shows the number with the action disabled', async () => {
    const catalog = start();
    const { user } = renderAction();
    await screen.findByTestId('clinics');
    catalog.setClinics(2, 3);
    const dialog = await openDialog(user);

    await confirmIn(user, dialog);

    const notice = await screen.findByText(text.errors.hasClinics);
    expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorWarning');
    await waitFor(() => {
      expect(screen.getByTestId('clinics')).toHaveTextContent('3');
    });
    expect(deleteButton()).toBeDisabled();
    expect(screen.getByText('Tiene 3 clínicas asignadas')).toBeInTheDocument();
  });

  it('says that the clinics could not be checked, and leaves the action available', async () => {
    const catalog = start();
    const { user } = renderAction();
    await screen.findByTestId('clinics');
    catalog.clinics.unavailable();
    const dialog = await openDialog(user);

    await confirmIn(user, dialog);

    const notice = await screen.findByText(text.errors.clinicsUnavailable);
    expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorError');
    expect(catalog.state.find(2)).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(deleteButton()).toBeEnabled();
  });

  it('says that it does not exist any more when another person deleted it', async () => {
    const catalog = start();
    const { user } = renderAction();
    await screen.findByTestId('clinics');
    catalog.remove(2);
    const dialog = await openDialog(user);

    await confirmIn(user, dialog);

    const notice = await screen.findByText(text.errors.notFound);
    expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorWarning');
  });
});

it('has no accessibility violations, enabled, disabled and with the dialog open', async () => {
  start();
  const enabled = renderAction(2);
  await screen.findByRole('button', { name: text.actions.delete });
  expect(await axe(enabled.container)).toHaveNoViolations();

  await openDialog(enabled.user);
  expect(await axe(enabled.baseElement)).toHaveNoViolations();
  enabled.unmount();

  const disabled = renderAction(1);
  await screen.findByText('Tiene 2 clínicas asignadas');
  expect(await axe(disabled.container)).toHaveNoViolations();
});
