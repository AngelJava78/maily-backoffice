import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  createSubscriptionsCatalogMock,
  defaultCatalog,
  makeSubscriptions,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NO_SUBSCRIPTION_CAPABILITIES } from '@/test/subscriptionCapabilities';

import { SubscriptionsListPage } from './SubscriptionsListPage';

const text = messages.subscriptions.list;
const CATALOG_PATH = '/api/v1/subscriptions';

/** The default catalog and 12 more active plans: 19 subscriptions, two pages of 10. */
function start(subscriptions = [...defaultCatalog().subscriptions, ...makeSubscriptions(12)]) {
  return createSubscriptionsCatalogMock({
    directory: createUsersDirectoryMock(),
    initial: { subscriptions },
  });
}

function renderList(route = '/subscriptions') {
  return renderWithProviders(
    [
      {
        path: '/subscriptions',
        element: <SubscriptionsListPage capabilities={NO_SUBSCRIPTION_CAPABILITIES} />,
      },
      { path: '/subscriptions/:subscriptionId', element: <p>Detalle</p> },
    ],
    { auth0: ADMIN_AUTH0, route },
  );
}

const grid = () => screen.getByRole('grid', { name: text.gridLabel });
const namesShown = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);

const PAGE_ONE = [
  'Enterprise',
  ...Array.from({ length: 9 }, (_, index) => `Plan prueba 0${index + 1}`),
];
const PAGE_TWO = [
  'Plan prueba 10',
  'Plan prueba 11',
  'Plan prueba 12',
  'Básico',
  'Pro',
  'Premium',
  'Legacy full',
  'Solo',
  'Suspendido',
];

describe('SubscriptionsListPage', () => {
  it('shows the title and the first 10 subscriptions in the fixed order, with the total (US1-1)', async () => {
    start();
    renderList();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.subscriptions.title }),
    ).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Enterprise' });
    expect(namesShown()).toEqual(PAGE_ONE);
    expect(screen.getByText('1–10 de 19')).toBeInTheDocument();
  });

  it('puts the inactive and the blocked ones after every active one (US1-3)', async () => {
    start();
    renderList('/subscriptions?page=2');

    await screen.findByRole('link', { name: 'Suspendido' });
    expect(namesShown()).toEqual(PAGE_TWO);
  });

  it('changes the page and its size in the address without asking the API again', async () => {
    const catalog = start();
    const { user, router } = renderList();
    await screen.findByRole('link', { name: 'Enterprise' });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));
    expect(await screen.findByText('11–19 de 19')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');

    await user.click(screen.getByLabelText(/filas por página/i));
    await user.click(screen.getByRole('option', { name: '25' }));

    expect(await screen.findByText('1–19 de 19')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page_size=25');
    expect(catalog.requestsTo('GET', CATALOG_PATH)).toHaveLength(1);
  });

  it('tells which subscriptions are shown in a status region that is already there', async () => {
    start();
    const { user } = renderList();
    await screen.findByRole('link', { name: 'Enterprise' });
    const region = screen.getByRole('status');
    await waitFor(() => {
      expect(region).toHaveTextContent(text.pageStatus(1, 10, 19));
    });

    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Mostrando 11 a 19 de 19 suscripciones.',
      );
    });
    expect(screen.getByRole('status')).toBe(region);
  });

  it('shows the last page instead of one that does not exist, and replaces the address', async () => {
    start();
    const { router } = renderList('/subscriptions?page=99');

    await screen.findByRole('link', { name: 'Suspendido' });
    expect(namesShown()).toEqual(PAGE_TWO);
    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=2');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('normalizes an address with values that are not valid', async () => {
    start();
    const { router } = renderList('/subscriptions?page=abc&page_size=7');

    await screen.findByRole('link', { name: 'Enterprise' });
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(namesShown()).toEqual(PAGE_ONE);
  });

  it('shows the error with a way to retry when the catalog cannot be loaded (US1-12)', async () => {
    const catalog = start();
    catalog.failNext({ method: 'GET', path: CATALOG_PATH, status: 500, code: 'internal_error' });
    const { user } = renderList();

    expect(await screen.findByText(text.loadError.title)).toBeInTheDocument();
    expect(screen.getByText(text.loadError.message)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByRole('link', { name: 'Enterprise' })).toBeInTheDocument();
  });

  it('says that there are no subscriptions when the catalog is empty (US1-10)', async () => {
    start([]);
    renderList();

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    start();
    const { container } = renderList();
    await screen.findByRole('link', { name: 'Enterprise' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
