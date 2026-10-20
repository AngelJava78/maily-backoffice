import { focusManager } from '@tanstack/react-query';
import { act, configure, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([import('@/features/home'), import('@/features/users')]);
}, 90_000);

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

const text = messages.dashboard;
const DASHBOARD_PATH = '/api/v1/dashboard';

/** The administrator of the users simulator, with or without `dashboard:read`. */
function start({ canRead }: { readonly canRead: boolean }) {
  const directory = createUsersDirectoryMock();
  if (canRead) {
    directory.grant('Administrator', 'dashboard:read');
  }
  const platform = createPlatformDashboardMock({ directory });
  return { directory, platform, askedFor: () => platform.requestsTo('GET', DASHBOARD_PATH).length };
}

function open() {
  return renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true });
}

/** Coming back to the tab checks the permissions again (feature 001, FR-019). */
function checkPermissionsAgain(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const indicators = () => screen.queryByRole('heading', { level: 2, name: text.indicatorsTitle });

async function untilIndicators(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.indicatorsTitle });
}

describe('the Panel and the permission dashboard:read (user story 2)', { timeout: 30_000 }, () => {
  it('tells whoever lacks it that they may not see the indicators, and asks nothing (FR-011, SC-003)', async () => {
    const { askedFor } = start({ canRead: false });
    open();

    expect(await screen.findByText(text.noPermission.title)).toBeInTheDocument();
    expect(screen.getByText(text.noPermission.message)).toBeInTheDocument();
    expect(screen.getByText(/^Hola, /)).toBeInTheDocument();
    expect(indicators()).not.toBeInTheDocument();
    expect(askedFor()).toBe(0);
  });

  it('takes the indicators away and stops asking when the permission is lost (FR-014)', async () => {
    const { directory, askedFor } = start({ canRead: true });
    vi.useFakeTimers();
    open();
    await untilIndicators();

    directory.revoke('Administrator', 'dashboard:read');
    checkPermissionsAgain();

    expect(await screen.findByText(text.noPermission.title)).toBeInTheDocument();
    expect(indicators()).not.toBeInTheDocument();
    const asked = askedFor();
    await advance(10 * 60_000);
    expect(askedFor()).toBe(asked);
    expect(indicators()).not.toBeInTheDocument();
  });

  it('shows the load, never the old data, and then the indicators when the permission comes back, without leaving (FR-014)', async () => {
    const { directory, platform } = start({ canRead: true });
    const { router } = open();
    await untilIndicators();
    directory.revoke('Administrator', 'dashboard:read');
    checkPermissionsAgain();
    await screen.findByText(text.noPermission.title);

    const release = platform.defer();
    directory.grant('Administrator', 'dashboard:read');
    checkPermissionsAgain();

    expect(
      await screen.findByRole('status', { name: messages.common.loading }),
    ).toBeInTheDocument();
    expect(indicators()).not.toBeInTheDocument();
    expect(screen.queryByText(text.noPermission.title)).not.toBeInTheDocument();
    release();
    await untilIndicators();
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows its own notice when the service refuses a refresh, without the general one and keeping the session (FR-015)', async () => {
    const { platform } = start({ canRead: true });
    vi.useFakeTimers();
    const { router, logout } = open();
    await untilIndicators();

    platform.failNext({ status: 403, code: 'permission_denied' });
    await advance(5 * 60_000);

    expect(await screen.findByText(text.noPermission.title)).toBeInTheDocument();
    expect(indicators()).not.toBeInTheDocument();
    expect(screen.queryByText(messages.forbidden.action)).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(logout).not.toHaveBeenCalled();
  });
});
