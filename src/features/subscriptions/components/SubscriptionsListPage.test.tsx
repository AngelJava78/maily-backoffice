import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  catalogSubscription,
  createSubscriptionsCatalogMock,
  defaultCatalog,
  makeSubscriptions,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';
import {
  ALL_SUBSCRIPTION_CAPABILITIES,
  NO_SUBSCRIPTION_CAPABILITIES,
} from '@/test/subscriptionCapabilities';

import { SubscriptionsListPage } from './SubscriptionsListPage';

const text = messages.subscriptions.list;
const comparison = messages.subscriptions.comparison;
const CATALOG_PATH = '/api/v1/subscriptions';

/** The default catalog and 12 more active plans: 19 subscriptions, two pages of 10. */
function start(subscriptions = [...defaultCatalog().subscriptions, ...makeSubscriptions(12)]) {
  return createSubscriptionsCatalogMock({
    directory: createUsersDirectoryMock(),
    initial: { subscriptions },
  });
}

function renderList(route = '/subscriptions', capabilities = NO_SUBSCRIPTION_CAPABILITIES) {
  return renderWithProviders(
    [
      {
        path: '/subscriptions',
        element: <SubscriptionsListPage capabilities={capabilities} />,
      },
      { path: '/subscriptions/:subscriptionId', element: <p>Detalle</p> },
      { path: '/subscriptions/:subscriptionId/edit', element: <p>Editar</p> },
    ],
    { auth0: ADMIN_AUTH0, route },
  );
}

const grid = () => screen.getByRole('grid', { name: text.gridLabel });
const namesShown = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);

// Ascending by monthly price, stable on a tie (020, FR-006): Enterprise and Legacy full tie at
// $0.00 (Enterprise comes first, created earlier); Solo ($900.00) ties with «Plan prueba 09» and,
// for the same reason, comes first.
const PAGE_ONE = [
  'Enterprise',
  'Legacy full',
  ...Array.from({ length: 8 }, (_, index) => `Plan prueba 0${index + 1}`),
];
const PAGE_TWO = [
  'Solo',
  'Plan prueba 09',
  'Plan prueba 10',
  'Plan prueba 11',
  'Plan prueba 12',
  'Básico',
  'Suspendido',
  'Pro',
  'Premium',
];

describe('SubscriptionsListPage', () => {
  it('shows the title and the first 10 subscriptions ordered by monthly price, with the total (US1-1, 020 FR-006)', async () => {
    start();
    renderList();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.subscriptions.title }),
    ).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Enterprise' });
    expect(namesShown()).toEqual(PAGE_ONE);
    expect(screen.getByText('1–10 de 19')).toBeInTheDocument();
  });

  it('continues the same ascending price order onto the second page (US1-3, 020 FR-006)', async () => {
    start();
    renderList('/subscriptions?page=2');

    await screen.findByRole('link', { name: 'Suspendido' });
    expect(namesShown()).toEqual(PAGE_TWO);
  });

  it('orders the whole catalog by the column and direction the address asks for, before paginating (020)', async () => {
    start();
    renderList('/subscriptions?sort=-name');

    await screen.findByRole('link', { name: 'Suspendido' });
    expect(namesShown()[0]).toBe('Suspendido');
    expect(namesShown()).toHaveLength(10);
  });

  it('reorders the list by clicking a column header, going back to the first page (020)', async () => {
    start();
    const { user, router } = renderList('/subscriptions?page=2');
    await screen.findByRole('link', { name: 'Suspendido' });

    await user.click(
      screen.getByRole('columnheader', { name: new RegExp(`^${text.columns.name}`) }),
    );

    expect(await screen.findByRole('link', { name: 'Básico' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?sort=name');
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

  describe('tabs: Listado and Comparativo', () => {
    it('shows Listado selected by default, and Comparativo next to it', async () => {
      start();
      renderList();
      await screen.findByRole('link', { name: 'Enterprise' });

      expect(
        screen.getByRole('tab', { name: comparison.listTabLabel, selected: true }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: comparison.tabLabel, selected: false }),
      ).toBeInTheDocument();
    });

    it('switches to the Comparativo panel without any new request to the catalog', async () => {
      const catalog = start();
      const { user } = renderList();
      await screen.findByRole('link', { name: 'Enterprise' });

      await user.click(screen.getByRole('tab', { name: comparison.tabLabel }));

      expect(screen.getByRole('table', { name: comparison.tabLabel })).toBeInTheDocument();
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      expect(catalog.requestsTo('GET', CATALOG_PATH)).toHaveLength(1);
    });

    it('opens directly in the Comparativo tab from the address, without mounting the grid', async () => {
      start();
      renderList('/subscriptions?tab=comparison');

      expect(await screen.findByRole('table', { name: comparison.tabLabel })).toBeInTheDocument();
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });

    it('shows "Editar" in the Comparativo only with subscriptions:update', async () => {
      start();
      renderList('/subscriptions?tab=comparison', ALL_SUBSCRIPTION_CAPABILITIES);

      await screen.findByRole('table', { name: comparison.tabLabel });
      expect(screen.getAllByRole('link', { name: comparison.editAction }).length).toBeGreaterThan(
        0,
      );
    });

    it('shows the same empty state as Listado when the catalog has nothing', async () => {
      start([]);
      renderList('/subscriptions?tab=comparison');

      expect(await screen.findByText(text.empty)).toBeInTheDocument();
    });

    it('has no accessibility violations in the Comparativo tab', async () => {
      start();
      const { container } = renderList('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: comparison.tabLabel });

      expect(await axe(container)).toHaveNoViolations();
    });

    const typeCatalog = messages.subscriptions.types.catalog;

    it('shows the type filter before the Mensual y Anual control (020, FR-007)', async () => {
      start();
      renderList('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: comparison.tabLabel });

      const typeFilter = screen.getByRole('button', { name: typeCatalog[1].name });
      const cycleToggle = screen.getByRole('button', { name: comparison.priceToggle.monthly });
      expect(
        typeFilter.compareDocumentPosition(cycleToggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('filters the Comparativo by type, defaulting to Individual (020, FR-007, FR-008)', async () => {
      // The default catalog here is all Individual: filtering to Empresarial leaves nothing.
      start();
      const { user } = renderList('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: comparison.tabLabel });
      expect(
        screen.getByRole('button', { name: typeCatalog[1].name, pressed: true }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: typeCatalog[2].name }));

      expect(screen.queryByRole('table', { name: comparison.tabLabel })).not.toBeInTheDocument();
      expect(screen.getByText(comparison.emptyForType(typeCatalog[2].name))).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: typeCatalog[1].name }));

      expect(await screen.findByRole('table', { name: comparison.tabLabel })).toBeInTheDocument();
    });

    it('orders the Comparativo ascending by the price of the vigente cycle, and reorders on cycle change (020, FR-009)', async () => {
      const directory = createUsersDirectoryMock();
      createSubscriptionsCatalogMock({
        directory,
        initial: {
          subscriptions: [
            catalogSubscription({
              id: 1,
              name: 'Alfa',
              monthlyPrice: '1000.00',
              annualPrice: '9000.00',
            }),
            catalogSubscription({
              id: 2,
              name: 'Beta',
              monthlyPrice: '500.00',
              annualPrice: '15000.00',
            }),
            catalogSubscription({
              id: 3,
              name: 'Gamma',
              monthlyPrice: '2000.00',
              annualPrice: '8000.00',
            }),
          ],
        },
      });
      const { user } = renderWithProviders(
        <SubscriptionsListPage capabilities={NO_SUBSCRIPTION_CAPABILITIES} />,
        { auth0: ADMIN_AUTH0, route: '/subscriptions?tab=comparison' },
      );

      // Each header cell's text starts with the plan's name (then its badge, price and status).
      const planOrder = () =>
        screen.getAllByRole('columnheader').map((header) => header.textContent);
      await screen.findByRole('table', { name: comparison.tabLabel });
      let order = planOrder();
      expect(order[0]).toMatch(/^Beta/);
      expect(order[1]).toMatch(/^Alfa/);
      expect(order[2]).toMatch(/^Gamma/);

      await user.click(screen.getByRole('button', { name: comparison.priceToggle.annual }));

      order = planOrder();
      expect(order[0]).toMatch(/^Gamma/);
      expect(order[1]).toMatch(/^Alfa/);
      expect(order[2]).toMatch(/^Beta/);
    });
  });
});
