import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  catalogSubscription,
  createSubscriptionsCatalogMock,
  quickstartCatalog,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

// The screens are lazy, and the first visit transforms the Data Grid, which takes a while when many
// files run at once: load them here so that no test pays for it while it waits for a screen.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/subscriptions/components/SubscriptionsListPage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
  ]);
}, 90_000);

const text = messages.subscriptions;

/** The users service with its default operator, and the catalog of quickstart.md (step 2). */
function start() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: quickstartCatalog() });
  return { directory, catalog };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const grid = () => screen.getByRole('grid', { name: text.list.gridLabel });
const namesShown = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);
const navigation = () => screen.getByRole('navigation', { name: messages.nav.label });

describe(
  'the subscriptions section: consulting (feature 003, user story 1)',
  { timeout: 30_000 },
  () => {
    it('lists the section in the navigation and opens the first page from it (V1)', async () => {
      start();
      const { user } = open('/');

      await screen.findByRole('navigation', { name: messages.nav.label });
      await user.click(
        await within(navigation()).findByRole('link', {
          name: messages.nav.sections.subscriptions,
        }),
      );

      expect(await screen.findByText('1–10 de 20')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument();
      expect(document.title).toBe(`${messages.titles.subscriptions} — ${messages.common.appName}`);
    });

    it('shows the two pages ordered by monthly price, ascending (020, FR-006; supersedes V3)', async () => {
      start();
      const { user } = open('/subscriptions');
      await screen.findByText('1–10 de 20');

      // Enterprise and Legacy full tie at $0.00 (Enterprise created earlier); Solo and «Plan prueba
      // 09» tie at $900.00 (Solo created earlier) — a stable sort keeps each tie in that order.
      expect(namesShown()).toEqual([
        'Enterprise',
        'Legacy full',
        ...Array.from({ length: 8 }, (_, index) => `Plan prueba 0${index + 1}`),
      ]);

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

      expect(await screen.findByText('11–20 de 20')).toBeInTheDocument();
      expect(namesShown()).toEqual([
        'Solo',
        'Plan prueba 09',
        'Plan prueba 10',
        'Plan prueba 11',
        'Plan prueba 12',
        'Básico',
        'Suspendido',
        'Pro',
        'Clínica Plus',
        'Premium',
      ]);
    });

    it('shows the seven columns with the right data for an Individual and an Enterprise plan (020, quickstart Z4)', async () => {
      const directory = createUsersDirectoryMock();
      const catalog = createSubscriptionsCatalogMock({
        directory,
        initial: {
          subscriptions: [
            catalogSubscription({
              id: 1,
              name: 'Independiente',
              subscriptionTypeId: 1,
              monthlyPrice: '500.00',
              annualPrice: '5000.00',
              consultingRoomsLimit: 1,
            }),
            catalogSubscription({
              id: 2,
              name: 'Corporativo',
              subscriptionTypeId: 2,
              clinicsLimit: 10,
              monthlyPrice: '9000.00',
              annualPrice: '90000.00',
              consultingRoomsLimit: 20,
            }),
          ],
        },
      });
      open('/subscriptions');
      await screen.findByRole('link', { name: 'Independiente' });

      const typeCatalog = messages.subscriptions.types.catalog;
      const individualRow = screen
        .getByRole('link', { name: 'Independiente' })
        .closest<HTMLElement>('[role="row"]');
      const enterpriseRow = screen
        .getByRole('link', { name: 'Corporativo' })
        .closest<HTMLElement>('[role="row"]');
      if (individualRow === null || enterpriseRow === null) {
        throw new Error('Expected both rows to exist');
      }
      expect(within(individualRow).getByText(typeCatalog[1].name)).toBeInTheDocument();
      expect(within(individualRow).getByText('1')).toBeInTheDocument();
      expect(within(individualRow).getByText('$500.00/mes')).toBeInTheDocument();
      expect(within(individualRow).getByText('$5,000.00/año')).toBeInTheDocument();

      expect(within(enterpriseRow).getByText(typeCatalog[2].name)).toBeInTheDocument();
      expect(within(enterpriseRow).getByText('20')).toBeInTheDocument();
      expect(within(enterpriseRow).getByText('$9,000.00/mes')).toBeInTheDocument();
      expect(within(enterpriseRow).getByText('$90,000.00/año')).toBeInTheDocument();
      expect(catalog.state.list()).toHaveLength(2);
    });

    it('shows a status added by hand with its name, on its page (FR-020)', async () => {
      start();
      open('/subscriptions?page=2');

      const row = (
        await screen.findByRole('link', { name: 'Plan prueba 12' })
      ).closest<HTMLElement>('[role="row"]');
      expect(within(row ?? document.body).getByText('En revisión')).toBeInTheDocument();
    });

    it('goes back to the same page after seeing a detail, and a new page size goes to the first one (US1-8, US1-2)', async () => {
      start();
      const { user, router } = open('/subscriptions?page=2');

      await user.click(await screen.findByRole('link', { name: 'Solo' }));
      expect(
        await screen.findByRole('heading', { level: 1, name: text.detail.title }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Para el médico que trabaja por su cuenta.'),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: text.detail.backToList }));

      expect(await screen.findByText('11–20 de 20')).toBeInTheDocument();
      expect(router.state.location.search).toBe('?page=2');

      await user.click(screen.getByLabelText(/filas por página/i));
      await user.click(screen.getByRole('option', { name: '25' }));

      expect(await screen.findByText('1–20 de 20')).toBeInTheDocument();
      expect(router.state.location.search).toBe('?page_size=25');
    });

    it('says «No disponible» for every subscription while the clinics cannot be counted', async () => {
      const { catalog } = start();
      catalog.clinics.unavailable();
      open('/subscriptions?page_size=25');

      await screen.findByText('1–20 de 20');
      expect(within(grid()).getAllByText(text.clinics.notAvailable)).toHaveLength(20);
    });

    it('hides the section from someone who cannot read the subscriptions, and sends them home with a notice (US1-13)', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:read');
      const { router } = open('/subscriptions');

      expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
      expect(
        within(navigation()).queryByRole('link', { name: messages.nav.sections.subscriptions }),
      ).not.toBeInTheDocument();
    });

    it('offers no action to someone who can only read the subscriptions (US1-14)', async () => {
      const { directory } = start();
      for (const action of ['write', 'update', 'delete']) {
        directory.revoke('Administrator', `subscriptions:${action}`);
      }
      open('/subscriptions/2');

      expect(await screen.findByText('Para clínicas en crecimiento.')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cambiar estatus/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
    });

    it('says that the address does not exist for an id that is not one, and that the subscription does not for one that is missing (V7)', async () => {
      start();
      const { unmount } = open('/subscriptions/abc');
      expect(
        await screen.findByRole('heading', { level: 1, name: messages.notFound.title }),
      ).toBeInTheDocument();
      unmount();

      open('/subscriptions/99999');
      expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    });

    it('shows an error when the API fails, and retrying recovers the list (V6)', async () => {
      const { catalog } = start();
      catalog.failAll(500);
      const { user } = open('/subscriptions');

      // The reading is retried twice on its own before the error shows.
      expect(await screen.findByText(text.list.loadError.title)).toBeInTheDocument();
      catalog.recover();
      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      expect(await screen.findByText('1–10 de 20')).toBeInTheDocument();
    });
  },
);

describe(
  'the subscriptions section: Comparativo (feature 012, user story 1)',
  { timeout: 30_000 },
  () => {
    it('switches to Comparativo from Listado without a new request, and shows the catalog', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions');
      await screen.findByText('1–10 de 20');
      const requestsBefore = catalog.requestsTo('GET', '/api/v1/subscriptions').length;

      await user.click(screen.getByRole('tab', { name: text.comparison.tabLabel }));

      expect(
        await screen.findByRole('table', { name: text.comparison.tabLabel }),
      ).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(catalog.requestsTo('GET', '/api/v1/subscriptions')).toHaveLength(requestsBefore);
    });

    it('changes the shown price with no request when Mensual/Anual is toggled', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: text.comparison.tabLabel });
      const requestsBefore = catalog.requestsTo('GET', '/api/v1/subscriptions').length;

      expect(screen.getByText('$8,900.00/mes')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: text.comparison.priceToggle.annual }));

      expect(screen.getAllByText('$1,000.00/año').length).toBeGreaterThan(0);
      expect(screen.queryByText('$8,900.00/mes')).not.toBeInTheDocument();
      expect(catalog.requestsTo('GET', '/api/v1/subscriptions')).toHaveLength(requestsBefore);
    });

    it('offers "Editar" in the Comparativo only with subscriptions:update', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:update');
      open('/subscriptions?tab=comparison');

      await screen.findByRole('table', { name: text.comparison.tabLabel });
      expect(
        screen.queryByRole('link', { name: text.comparison.editAction }),
      ).not.toBeInTheDocument();
    });

    describe('the type filter (020, quickstart Z6-Z8)', () => {
      const typeCatalog = messages.subscriptions.types.catalog;

      function startWithBothTypes() {
        const directory = createUsersDirectoryMock();
        const catalog = createSubscriptionsCatalogMock({
          directory,
          initial: {
            subscriptions: [
              catalogSubscription({ id: 1, name: 'Independiente', subscriptionTypeId: 1 }),
              catalogSubscription({
                id: 2,
                name: 'Corporativo',
                subscriptionTypeId: 2,
                clinicsLimit: 5,
              }),
            ],
          },
        });
        return { directory, catalog };
      }

      it('shows the type filter before Mensual y Anual, defaulting to Individual (Z6)', async () => {
        startWithBothTypes();
        open('/subscriptions?tab=comparison');
        await screen.findByRole('table', { name: text.comparison.tabLabel });

        const typeFilter = screen.getByRole('button', {
          name: typeCatalog[1].name,
          pressed: true,
        });
        const cycleToggle = screen.getByRole('button', {
          name: text.comparison.priceToggle.monthly,
        });
        expect(
          typeFilter.compareDocumentPosition(cycleToggle) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.getByText('Independiente')).toBeInTheDocument();
        expect(screen.queryByText('Corporativo')).not.toBeInTheDocument();
      });

      it('filters to the chosen type without a new request, keeping the cycle (Z7, Z8)', async () => {
        const { catalog } = startWithBothTypes();
        const { user } = open('/subscriptions?tab=comparison');
        await screen.findByRole('table', { name: text.comparison.tabLabel });
        await user.click(screen.getByRole('button', { name: text.comparison.priceToggle.annual }));
        const requestsBefore = catalog.requestsTo('GET', '/api/v1/subscriptions').length;

        await user.click(screen.getByRole('button', { name: typeCatalog[2].name }));

        expect(screen.getByText('Corporativo')).toBeInTheDocument();
        expect(screen.queryByText('Independiente')).not.toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: text.comparison.priceToggle.annual, pressed: true }),
        ).toBeInTheDocument();
        expect(catalog.requestsTo('GET', '/api/v1/subscriptions')).toHaveLength(requestsBefore);

        await user.click(screen.getByRole('button', { name: typeCatalog[1].name }));

        expect(screen.getByText('Independiente')).toBeInTheDocument();
        expect(screen.queryByText('Corporativo')).not.toBeInTheDocument();
      });

      it('shows a notice, not an empty table, when the chosen type has no plan (edge case)', async () => {
        const directory = createUsersDirectoryMock();
        createSubscriptionsCatalogMock({
          directory,
          initial: {
            subscriptions: [catalogSubscription({ id: 1, name: 'Independiente' })],
          },
        });
        const { user } = open('/subscriptions?tab=comparison');
        await screen.findByRole('table', { name: text.comparison.tabLabel });

        await user.click(screen.getByRole('button', { name: typeCatalog[2].name }));

        expect(
          screen.queryByRole('table', { name: text.comparison.tabLabel }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(text.comparison.emptyForType(typeCatalog[2].name)),
        ).toBeInTheDocument();
      });
    });

    // The simulator always stores a concrete clinicsLimit (like the real, predicted contract once
    // deployed, 019 contracts/subscriptions-service.md): a null value, shown as «No disponible»,
    // is already covered at the component level (SubscriptionsComparisonTable.test.tsx).
    it('shows the clinics limit in «Límites de la clínica» (020, Z10)', async () => {
      const directory = createUsersDirectoryMock();
      createSubscriptionsCatalogMock({
        directory,
        initial: {
          subscriptions: [catalogSubscription({ id: 1, name: 'Con límite', clinicsLimit: 25 })],
        },
      });
      open('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: text.comparison.tabLabel });

      const row = screen.getByRole('row', { name: text.comparison.sections.clinicsLimit });
      expect(within(row).getByText('25')).toBeInTheDocument();
    });

    it('shows an icon, never the text, for each module included or not (020, Z11)', async () => {
      start();
      open('/subscriptions?tab=comparison');
      await screen.findByRole('table', { name: text.comparison.tabLabel });

      expect(screen.queryByText(text.comparison.moduleIncluded)).not.toBeInTheDocument();
      expect(screen.queryByText(text.comparison.moduleNotIncluded)).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('img', { name: text.comparison.moduleIncluded }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole('img', { name: text.comparison.moduleNotIncluded }).length,
      ).toBeGreaterThan(0);
    });
  },
);
