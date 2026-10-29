import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { createClinicModulesCatalogMock } from '@/test/handlers/subscriptionModulesCatalog';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';
import {
  NO_SUBSCRIPTION_CAPABILITIES,
  subscriptionCapabilities,
} from '@/test/subscriptionCapabilities';

import type { SubscriptionCapabilities } from '../policy/subscriptionActions';
import { subscriptionKeys } from '../hooks/subscriptionKeys';
import { SubscriptionDetailPage } from './SubscriptionDetailPage';

const text = messages.subscriptions.detail;
const modulesText = messages.subscriptions.modules;

function start() {
  const modules = createClinicModulesCatalogMock();
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  return { catalog, modules };
}

function renderDetail(
  subscriptionId = 2,
  {
    state,
    capabilities = NO_SUBSCRIPTION_CAPABILITIES,
  }: { readonly state?: unknown; readonly capabilities?: SubscriptionCapabilities } = {},
) {
  const pathname = `/subscriptions/${subscriptionId}`;
  return renderWithProviders(
    [
      {
        path: '/subscriptions/:subscriptionId',
        element: (
          <SubscriptionDetailPage subscriptionId={subscriptionId} capabilities={capabilities} />
        ),
      },
      { path: '/subscriptions/:subscriptionId/edit', element: <p>Edición</p> },
      { path: '/subscriptions', element: <p>Listado</p> },
    ],
    { auth0: ADMIN_AUTH0, initialEntries: [state === undefined ? pathname : { pathname, state }] },
  );
}

describe('SubscriptionDetailPage', () => {
  it('shows the title from the first render, and that it is loading, while the data come', async () => {
    const { catalog } = start();
    const release = catalog.defer();
    renderDetail();

    expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: messages.common.loading })).toBeInTheDocument();
    release();
    expect(await screen.findByText('Para clínicas en crecimiento.')).toBeInTheDocument();
  });

  it('shows the data of the subscription', async () => {
    start();
    renderDetail();

    expect(await screen.findByText('Para clínicas en crecimiento.')).toBeInTheDocument();
    expect(screen.getByText('$4,500.00/mes')).toBeInTheDocument();
    expect(screen.getByText('Hasta 5 consultorios')).toBeInTheDocument();
  });

  it('says that the subscription was not found, with a way back to the list (US1-11)', async () => {
    start();
    renderDetail(99);

    expect(await screen.findByText(text.notFound.title)).toBeInTheDocument();
    expect(screen.getByText(text.notFound.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.notFound.backToList })).toHaveAttribute(
      'href',
      '/subscriptions',
    );
  });

  it('says the same of a subscription deleted by another person', async () => {
    const { catalog } = start();
    catalog.remove(2);
    renderDetail(2);

    expect(await screen.findByText(text.notFound.title)).toBeInTheDocument();
  });

  it('shows any other failure as an error, and retrying shows the subscription', async () => {
    const { catalog } = start();
    catalog.failNext({
      method: 'GET',
      path: '/api/v1/subscriptions/2',
      status: 500,
      code: 'internal_error',
    });
    const { user } = renderDetail();

    expect(await screen.findByText(text.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('Para clínicas en crecimiento.')).toBeInTheDocument();
  });

  it('keeps the data on screen when a refresh fails, with a notice and a way to retry', async () => {
    const { catalog } = start();
    const { queryClient, user } = renderDetail();
    await screen.findByText('Para clínicas en crecimiento.');

    catalog.failNext({
      method: 'GET',
      path: '/api/v1/subscriptions/2',
      status: 500,
      code: 'internal_error',
    });
    await queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(2), exact: true });

    const notice = await screen.findByText(text.refreshError);
    expect(screen.getByText('Para clínicas en crecimiento.')).toBeInTheDocument();
    expect(screen.queryByText(text.loadError.title)).not.toBeInTheDocument();

    await user.click(
      within(notice.closest<HTMLElement>('[role="alert"]') ?? document.body).getByRole('button', {
        name: messages.common.retry,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText(text.refreshError)).not.toBeInTheDocument();
    });
  });

  describe('going back to the list', () => {
    it('returns to the page that the person came from (US1-8)', async () => {
      start();
      renderDetail(2, { state: { listSearch: '?page=2&page_size=25' } });

      expect(await screen.findByRole('link', { name: text.backToList })).toHaveAttribute(
        'href',
        '/subscriptions?page=2&page_size=25',
      );
    });

    it('returns to the list when the person arrived without coming from it', async () => {
      start();
      renderDetail();

      expect(await screen.findByRole('link', { name: text.backToList })).toHaveAttribute(
        'href',
        '/subscriptions',
      );
    });

    it('ignores a search that the list could not have written', async () => {
      start();
      renderDetail(2, { state: { listSearch: '?next=https://evil.example' } });

      expect(await screen.findByRole('link', { name: text.backToList })).toHaveAttribute(
        'href',
        '/subscriptions',
      );
    });

    it('offers the way back while the subscription loads and when it fails', async () => {
      const { catalog } = start();
      catalog.failAll(500);
      renderDetail();

      expect(screen.getByRole('link', { name: text.backToList })).toBeInTheDocument();
      expect(await screen.findByText(text.loadError.title)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: text.backToList })).toBeInTheDocument();
    });
  });

  it('offers no action to someone who can only read the subscriptions (US1-14)', async () => {
    start();
    renderDetail();

    await screen.findByText('Para clínicas en crecimiento.');
    expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cambiar estatus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  describe('the actions, each one only for whoever may do it', () => {
    it('offers «Editar» with canEdit, which carries the list it came from (US3)', async () => {
      start();
      const { user, router } = renderDetail(2, {
        state: { listSearch: '?page=2' },
        capabilities: subscriptionCapabilities({ canChangeStatus: false, canDelete: false }),
      });

      const edit = await screen.findByRole('link', { name: messages.subscriptions.actions.edit });
      expect(edit).toHaveAttribute('href', '/subscriptions/2/edit');
      await user.click(edit);

      expect(router.state.location.pathname).toBe('/subscriptions/2/edit');
      expect(router.state.location.state).toEqual({ listSearch: '?page=2' });
    });

    it('offers «Cambiar estatus» with canChangeStatus (US4)', async () => {
      start();
      renderDetail(2, {
        capabilities: subscriptionCapabilities({ canEdit: false, canDelete: false }),
      });

      expect(
        await screen.findByRole('button', { name: messages.subscriptions.actions.changeStatus }),
      ).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('does not offer «Cambiar estatus» without canChangeStatus', async () => {
      start();
      renderDetail(2, { capabilities: subscriptionCapabilities({ canChangeStatus: false }) });

      await screen.findByText('Para clínicas en crecimiento.');
      expect(
        screen.queryByRole('button', { name: messages.subscriptions.actions.changeStatus }),
      ).not.toBeInTheDocument();
    });

    it('offers «Eliminar» with canDelete, enabled without clinics and disabled with them (US5)', async () => {
      start();
      const { unmount } = renderDetail(2, {
        capabilities: subscriptionCapabilities({ canEdit: false, canChangeStatus: false }),
      });
      expect(
        await screen.findByRole('button', { name: messages.subscriptions.actions.delete }),
      ).toBeEnabled();
      unmount();

      renderDetail(1, {
        capabilities: subscriptionCapabilities({ canEdit: false, canChangeStatus: false }),
      });
      expect(await screen.findByText(messages.subscriptions.deleteBlocked(2))).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: messages.subscriptions.actions.delete }),
      ).toBeDisabled();
    });

    it('does not offer «Eliminar», nor its reason, without canDelete', async () => {
      start();
      renderDetail(1, { capabilities: subscriptionCapabilities({ canDelete: false }) });

      await screen.findByText('$1,500.00/mes');
      expect(
        screen.queryByRole('button', { name: messages.subscriptions.actions.delete }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(messages.subscriptions.deleteBlocked(2))).not.toBeInTheDocument();
    });

    it('does not offer «Editar» without canEdit', async () => {
      start();
      renderDetail(2, { capabilities: subscriptionCapabilities({ canEdit: false }) });

      await screen.findByText('Para clínicas en crecimiento.');
      expect(
        screen.queryByRole('link', { name: messages.subscriptions.actions.edit }),
      ).not.toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    start();
    const { container } = renderDetail();
    await screen.findByText('Para clínicas en crecimiento.');

    expect(await axe(container)).toHaveNoViolations();
  });

  describe('the modules section (022)', () => {
    it('shows a loading indicator in the modules section while its own catalog loads, with the rest of the detail already visible', async () => {
      const { modules } = start();
      modules.hang();
      renderDetail();

      await screen.findByText('Para clínicas en crecimiento.');
      expect(screen.getByLabelText(messages.common.loading)).toBeInTheDocument();
    });

    it('shows an error state with retry in the modules section when its own catalog fails, without touching the rest of the detail', async () => {
      const { modules } = start();
      modules.failWith(500);
      const { user } = renderDetail();
      await screen.findByText('Para clínicas en crecimiento.');

      expect(await screen.findByText(modulesText.loadError.title)).toBeInTheDocument();
      modules.recover();
      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      await waitFor(() => {
        expect(screen.queryByText(modulesText.loadError.title)).not.toBeInTheDocument();
      });
    });
  });
});
