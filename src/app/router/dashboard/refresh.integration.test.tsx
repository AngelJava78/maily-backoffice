import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor, within } from '@testing-library/react';
import { createMocks } from 'react-idle-timer';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { ADMIN_AUTH0, ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp, type RenderAppOptions } from '@/test/renderApp';
import { renderWithProviders } from '@/test/renderWithProviders';

import { appRoutes } from '../routes';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
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

const text = messages.dashboard;
const DASHBOARD_PATH = '/api/v1/dashboard';
const MINUTE_MS = 60_000;

/** The administrator of the users simulator, whose role has been given `dashboard:read`. */
function start() {
  const directory = createUsersDirectoryMock();
  directory.grant('Administrator', 'dashboard:read');
  const platform = createPlatformDashboardMock({ directory });
  return { directory, platform, askedFor: () => platform.requestsTo('GET', DASHBOARD_PATH).length };
}

function open(options: RenderAppOptions = {}) {
  return renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true, ...options });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function advanceTo(time: number): Promise<void> {
  await advance(time - Date.now());
}

/** The real `setTimeout`, taken before any test fakes the clock. */
const realSetTimeout = globalThis.setTimeout;

/**
 * Lets the work under way go on until `done`, without moving the fake clock: only what is due now
 * runs, and real turns of the event loop let the simulator answer and React draw.
 */
async function settleUntil(done: () => boolean): Promise<void> {
  for (let turn = 0; turn < 50 && !done(); turn += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await new Promise<void>((resolve) => {
        realSetTimeout(resolve, 0);
      });
    });
  }
  expect(done()).toBe(true);
}

function hideTab(): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  act(() => {
    window.dispatchEvent(new Event('visibilitychange'));
  });
}

async function untilIndicators(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.indicatorsTitle });
}

function navigateTo(label: string) {
  const navigation = screen.getByRole('navigation', { name: messages.nav.label });
  return within(navigation).getByRole('link', { name: label });
}

/** The text that says when the data on screen was updated. */
function lastUpdated(): string | null {
  return screen.getByText((content) => content.startsWith(text.lastUpdated(''))).textContent;
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

/** Every value kept in the session storage of the browser. */
function sessionStorageTexts(): string {
  return Array.from(
    { length: sessionStorage.length },
    (_, index) => sessionStorage.getItem(sessionStorage.key(index) ?? '') ?? '',
  ).join('\n');
}

describe('the Panel keeps itself up to date (user story 3)', { timeout: 30_000 }, () => {
  it('shows the data it had at once when the person comes back, says it is updating, and then the new time (FR-018, SC-005)', async () => {
    const { platform } = start();
    vi.useFakeTimers();
    const { user } = open();
    await untilIndicators();
    const firstTime = lastUpdated();

    await user.click(navigateTo(messages.nav.sections.users));
    await screen.findByRole('heading', { level: 1, name: messages.users.title });
    // A moment later, so that the time of the update has to change.
    await advance(2_000);
    const release = platform.defer();
    await user.click(navigateTo(messages.nav.home));

    expect(await screen.findByText(text.updating)).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: messages.common.loading })).not.toBeInTheDocument();
    expect(valueOf(text.indicators.totalPatients)).toHaveTextContent('1,284');
    expect(lastUpdated()).toBe(firstTime);

    release();
    await waitFor(() => {
      expect(lastUpdated()).not.toBe(firstTime);
    });
    expect(screen.queryByText(text.updating)).not.toBeInTheDocument();
  });

  it('asks nothing while the tab is hidden (FR-017)', async () => {
    const { askedFor } = start();
    vi.useFakeTimers();
    open();
    await untilIndicators();
    const asked = askedFor();

    hideTab();
    await advance(10 * MINUTE_MS);

    expect(askedFor()).toBe(asked);
  });

  it('never has more than one query of the Panel on its way when the person comes and goes quickly (FR-021, SC-007)', async () => {
    const { platform } = start();
    const { user } = open();
    await untilIndicators();
    const before = platform.requestCount;
    const release = platform.defer();
    /** The queries made since then that were neither cancelled nor answered (all wait). */
    const onTheirWay = () =>
      platform.requestsTo('GET', DASHBOARD_PATH).filter((request) => !request.aborted).length -
      before;

    for (let round = 0; round < 10; round += 1) {
      await user.click(navigateTo(messages.nav.sections.users));
      await screen.findByRole('heading', { level: 1, name: messages.users.title });
      await waitFor(() => {
        expect(onTheirWay()).toBe(0);
      });
      await user.click(navigateTo(messages.nav.home));
      await screen.findByRole('heading', { level: 1, name: messages.home.title });
      expect(onTheirWay()).toBeLessThanOrEqual(1);
    }

    expect(platform.requestsTo('GET', DASHBOARD_PATH)).toHaveLength(before + 10);
    release();
    await waitFor(() => {
      expect(screen.queryByText(text.updating)).not.toBeInTheDocument();
    });
    expect(onTheirWay()).toBe(1);
  });

  it('forgets the data when the session ends: signing in again shows the load, never the old values (FR-022, SC-009)', async () => {
    const { platform } = start();
    // The whole application with a session that can end and start again in the same page.
    const { user, auth0, updateAuth0 } = renderWithProviders(appRoutes, {
      route: '/',
      auth0: ADMIN_AUTH0,
    });
    auth0.logout.mockImplementation(() => {
      updateAuth0({ isAuthenticated: false, user: undefined });
      return Promise.resolve();
    });
    await untilIndicators();
    expect(sessionStorageTexts()).not.toContain('Clínica Santa Aurora');

    await user.click(screen.getByRole('button', { name: messages.common.logout }));
    await screen.findByRole('heading', { level: 1, name: messages.access.title });
    expect(sessionStorageTexts()).not.toContain('Clínica Santa Aurora');

    const release = platform.defer();
    updateAuth0(ADMIN_AUTH0);

    await screen.findByRole('heading', { level: 1, name: messages.home.title });
    expect(
      await screen.findByRole('status', { name: messages.common.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByText('1,284')).not.toBeInTheDocument();
    expect(screen.queryByText('Clínica Santa Aurora')).not.toBeInTheDocument();
    release();
    await untilIndicators();
  });

  it('lets the session close for inactivity although the Panel refreshes every minute (FR-023)', async () => {
    const { askedFor } = start();
    // The idle timer keeps the timers it found when it was loaded: point it at the fake ones.
    vi.useFakeTimers();
    createMocks();
    const app = open({ env: { VITE_DASHBOARD_REFRESH_MINUTES: 1 } });
    await screen.findByRole(
      'heading',
      { level: 2, name: text.indicatorsTitle },
      { timeout: 20_000 },
    );

    await advance(15 * MINUTE_MS);

    expect(askedFor()).toBeGreaterThanOrEqual(14);
    expect(app.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access/idle` },
    });
  });
});

describe('the interval of each environment (user story 5)', { timeout: 30_000 }, () => {
  /**
   * Opens the Panel with the fake clock and lets its first answer arrive at a known moment, which
   * is when the interval starts counting; gives that moment.
   */
  async function openAndAnswer(
    options: RenderAppOptions,
    platform: ReturnType<typeof start>['platform'],
  ): Promise<number> {
    const release = platform.defer();
    vi.useFakeTimers();
    open(options);
    await waitFor(() => {
      expect(platform.requestsTo('GET', DASHBOARD_PATH)).toHaveLength(1);
    });

    release();
    const answeredAt = Date.now();
    await settleUntil(
      () => screen.queryByRole('heading', { level: 2, name: text.indicatorsTitle }) !== null,
    );
    return answeredAt;
  }

  it('asks every minute where VITE_DASHBOARD_REFRESH_MINUTES is 1 (FR-028)', async () => {
    const { platform, askedFor } = start();
    const answeredAt = await openAndAnswer(
      { env: { VITE_DASHBOARD_REFRESH_MINUTES: 1 } },
      platform,
    );

    await advanceTo(answeredAt + 59_999);
    await settleUntil(() => true);
    expect(askedFor()).toBe(1);
    // Exactly then: settling does not move the clock.
    await advanceTo(answeredAt + 60_000);
    await settleUntil(() => askedFor() === 2);
  });

  it('does not ask after a minute with the default of 5 minutes (FR-028)', async () => {
    const { platform, askedFor } = start();
    const answeredAt = await openAndAnswer({}, platform);

    await advanceTo(answeredAt + 60_000);
    await settleUntil(() => true);

    expect(askedFor()).toBe(1);
  });
});
