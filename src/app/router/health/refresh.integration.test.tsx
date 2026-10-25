import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMocks } from 'react-idle-timer';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { ADMIN_AUTH0, ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { logOutFromHeader } from '@/test/profileMenu';
import { renderApp, type RenderAppOptions } from '@/test/renderApp';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { subscriptionsUrl } from '@/test/subscriptionsClient';

import { appRoutes } from '../routes';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/health'),
    import('@/features/health/pages/HealthPage'),
    import('@/features/home'),
    import('@/features/users'),
    import('@/features/users/components/UsersListPage'),
  ]);
}, 90_000);

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
  // The idle timer keeps the timers it found last: give it the real ones back.
  createMocks();
});

const text = messages.health;
const HEALTH_PATH = '/api/v1/health';
const MINUTE_MS = 60_000;

/** The administrator of the users simulator, whose role has been given `health:read`. */
function start() {
  const directory = createUsersDirectoryMock();
  directory.grant('Administrator', 'health:read');
  const health = createHealthMonitoringMock({ directory });
  return { directory, health, askedFor: () => health.requestsTo('GET', HEALTH_PATH).length };
}

function open(options: RenderAppOptions = {}) {
  return renderApp({ url: '/health', sub: ADMIN_SUB, signedIn: true, ...options });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function untilShown(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.page.componentsTitle });
}

function navigateTo(label: string) {
  const navigation = screen.getByRole('navigation', { name: messages.nav.label });
  return within(navigation).getByRole('link', { name: label });
}

describe('«Salud de servicios» keeps itself up to date (user story 2)', { timeout: 30_000 }, () => {
  it('shows the data it had at once, updating, when the person comes back with a query left behind (US2-7, FR-025)', async () => {
    const { health, askedFor } = start();
    const { user } = open();
    await untilShown();
    const release = health.defer();
    await user.click(screen.getByRole('button', { name: text.page.refresh }));
    await waitFor(() => {
      expect(askedFor()).toBe(2);
    });

    await user.click(navigateTo(messages.nav.sections.users));
    await screen.findByRole('heading', { level: 1, name: messages.users.title });
    await waitFor(() => {
      expect(health.requests[1]?.aborted).toBe(true);
    });
    await user.click(navigateTo(messages.nav.sections.health));

    expect(await screen.findByText(text.page.updating)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'MailySoft System API' })).toBeVisible();
    expect(screen.queryByRole('status', { name: messages.common.loading })).not.toBeInTheDocument();
    expect(askedFor()).toBe(3);
    release();
    await waitFor(() => {
      expect(screen.queryByText(text.page.updating)).not.toBeInTheDocument();
    });
    expect(askedFor()).toBe(3);
  });

  it('forgets the data when the session ends: signing in again shows the load, never the old data (SC-010)', async () => {
    const { health } = start();
    const { user, auth0, updateAuth0 } = renderWithProviders(appRoutes, {
      route: '/health',
      auth0: ADMIN_AUTH0,
    });
    auth0.logout.mockImplementation(() => {
      updateAuth0({ isAuthenticated: false, user: undefined });
      return Promise.resolve();
    });
    await untilShown();

    await logOutFromHeader(user);
    await screen.findByRole('heading', { level: 1, name: messages.access.title });
    const release = health.defer();
    updateAuth0(ADMIN_AUTH0);
    await screen.findByRole('navigation', { name: messages.nav.label });
    await user.click(navigateTo(messages.nav.sections.health));

    expect(
      await screen.findByRole('status', { name: messages.common.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByText('MailySoft System API')).not.toBeInTheDocument();
    release();
    await untilShown();
  });

  it('lets the session close for inactivity although the page refreshes every 30 s (FR-028)', async () => {
    const { askedFor } = start();
    // The idle timer keeps the timers it found when it was loaded: point it at the fake ones.
    vi.useFakeTimers();
    createMocks();
    const app = open();
    await screen.findByRole(
      'heading',
      { level: 2, name: text.page.componentsTitle },
      { timeout: 20_000 },
    );

    await advance(15 * MINUTE_MS);

    expect(askedFor()).toBeGreaterThanOrEqual(28);
    expect(app.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access/idle` },
    });
  });

  it('ends the session as everywhere else when the service refuses the token, and comes back here (FR-033)', async () => {
    start();
    server.use(
      http.get(subscriptionsUrl(HEALTH_PATH), () =>
        HttpResponse.json(
          { code: 'invalid_token', message: 'El token de acceso no es válido.' },
          { status: 401 },
        ),
      ),
    );
    const { router } = open();

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/access');
    });
    expect(router.state.location.state).toEqual({ returnTo: '/health' });
    expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.expired);
  });

  it('sends the person to the Panel and forgets the data when the permission is lost (FR-032)', async () => {
    const { directory } = start();
    vi.useFakeTimers();
    const { router, queryClient } = renderWithProviders(appRoutes, {
      route: '/health',
      auth0: ADMIN_AUTH0,
    });
    await untilShown();

    directory.revoke('Administrator', 'health:read');
    // The access is checked again every 5 minutes (feature 001, FR-019).
    await advance(5 * MINUTE_MS);

    expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    await waitFor(() => {
      expect(queryClient.getQueryCache().findAll({ queryKey: ['health'] })).toEqual([]);
    });
  });
});
