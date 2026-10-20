import { act, configure, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';
import { subscriptionsUrl } from '@/test/subscriptionsClient';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([import('@/features/home'), import('@/features/users')]);
}, 90_000);

afterEach(() => {
  vi.useRealTimers();
});

const text = messages.dashboard;
const INTERVAL_MS = 300_000;
/** The query of a cycle and its two retries, 1 and 2 seconds apart (constitution IV). */
const RETRIES_MS = 3_000;

/** The administrator of the users simulator, whose role has been given `dashboard:read`. */
function start() {
  const directory = createUsersDirectoryMock();
  directory.grant('Administrator', 'dashboard:read');
  return createPlatformDashboardMock({ directory });
}

function open() {
  return renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function untilIndicators(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.indicatorsTitle });
}

/** The value next to a label of the list of indicators. */
function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== 'DD') {
    throw new Error(`There is no value for ${label}`);
  }
  return value;
}

function lastUpdated(): string | null {
  return screen.getByText((content) => content.startsWith(text.lastUpdated(''))).textContent;
}

describe('the Panel when the platform fails (user story 4)', { timeout: 30_000 }, () => {
  it('keeps the data and its time when a cycle fails, with a notice and nothing to click, until a later one works (FR-024 to FR-026, SC-006)', async () => {
    const platform = start();
    vi.useFakeTimers();
    open();
    await untilIndicators();
    const firstTime = lastUpdated();

    platform.authorizationUnavailable();
    await advance(INTERVAL_MS + RETRIES_MS);

    expect(await screen.findByText(text.refreshFailed)).toBeInTheDocument();
    expect(valueOf(text.indicators.totalPatients)).toHaveTextContent('1,284');
    expect(lastUpdated()).toBe(firstTime);
    expect(
      within(screen.getByRole('main')).queryByRole('button', { name: messages.common.retry }),
    ).not.toBeInTheDocument();

    platform.recover();
    await advance(INTERVAL_MS);

    await waitFor(() => {
      expect(screen.queryByText(text.refreshFailed)).not.toBeInTheDocument();
    });
    expect(lastUpdated()).not.toBe(firstTime);
  });

  it('says that the indicators could not be loaded when the first load fails, and shows them once a cycle works (FR-025, FR-026)', async () => {
    const platform = start();
    platform.failAll(500);
    vi.useFakeTimers();
    open();

    expect(await screen.findByText(text.loadError.title)).toBeInTheDocument();
    expect(screen.getByText(text.loadError.message)).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).queryByRole('button', { name: messages.common.retry }),
    ).not.toBeInTheDocument();

    platform.recover();
    await advance(INTERVAL_MS);

    await untilIndicators();
    expect(screen.queryByText(text.loadError.title)).not.toBeInTheDocument();
  });

  it('ends the session as everywhere else when the service refuses the token after renewing it (FR-027)', async () => {
    start();
    server.use(
      http.get(subscriptionsUrl('/api/v1/dashboard'), () =>
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
    expect(router.state.location.state).toEqual({ returnTo: '/' });
    expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.expired);
  });
});
