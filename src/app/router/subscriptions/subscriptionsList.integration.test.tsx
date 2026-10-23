import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
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

    it('shows the two pages in the fixed order of quickstart.md (V3)', async () => {
      start();
      const { user } = open('/subscriptions');
      await screen.findByText('1–10 de 20');

      expect(namesShown()).toEqual([
        'Enterprise',
        ...Array.from({ length: 9 }, (_, index) => `Plan prueba 0${index + 1}`),
      ]);

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }));

      expect(await screen.findByText('11–20 de 20')).toBeInTheDocument();
      expect(namesShown()).toEqual([
        'Plan prueba 10',
        'Plan prueba 11',
        'Básico',
        'Clínica Plus',
        'Pro',
        'Premium',
        'Legacy full',
        'Solo',
        'Plan prueba 12',
        'Suspendido',
      ]);
    });

    it('shows a status added by hand with its name, in the second group (FR-020)', async () => {
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
  },
);
