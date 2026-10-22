import { GenericError } from '@auth0/auth0-react';
import { focusManager } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { createMocks } from 'react-idle-timer';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionChannel } from '@/shared/lib/sessionChannel';
import { messages } from '@/shared/messages/es';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock, type MockAccount } from '@/test/handlers/usersService';
import { renderApp } from '@/test/renderApp';

// These tests put the real Auth0Provider, router, guard and providers together, around a fake
// Auth0 client. They exist because the order in which Auth0, React and the router update cannot be
// reproduced by unit tests that fake any of them.

const SUB = 'auth0|user1';

const marketing: MockAccount = {
  user: userDto({ auth0_id: SUB }),
  roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
};
// Of type Clínica, explicitly (feature 006, research D8): `roleDto`'s default is now Sistema.
const ownerOnly: MockAccount = {
  user: userDto({ auth0_id: SUB }),
  roles: [roleDto({ id: 5, name: 'Owner', type: { id: 2, name: 'Clínica' }, permissions: [] })],
};

const toClose: { close: () => void }[] = [];

/** Another tab of the browser. */
function otherTab() {
  const channel = createSessionChannel();
  toClose.push(channel);
  return channel;
}

/** The tab loses the focus and gets it back, which makes the access be checked again. */
function returnToTab(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
}

afterEach(() => {
  for (const channel of toClose.splice(0)) {
    channel.close();
  }
  vi.useRealTimers();
  createMocks();
});

describe('coming back from Auth0', () => {
  it('lands on the address that was asked for (FR-007, US1-3, SC-004)', async () => {
    createUsersServiceMock({ [SUB]: marketing });

    const app = renderApp({ callback: { appState: { returnTo: '/profile?page=2' } } });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeInTheDocument();
    expect(app.router.state.location.pathname + app.router.state.location.search).toBe(
      '/profile?page=2',
    );
    expect(app.trail).not.toContain('/');
  });

  it('lands on "page not found" when the address that was asked for does not exist', async () => {
    createUsersServiceMock({ [SUB]: marketing });

    const app = renderApp({ callback: { appState: { returnTo: '/usuaros' } } });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.notFound.title }),
    ).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe('/usuaros');
  });

  it.each([
    ['there is no return address', undefined],
    ['the return address is not inside the application', { returnTo: 'https://evil.example.com' }],
  ])('lands on the home page when %s', async (_label, appState) => {
    createUsersServiceMock({ [SUB]: marketing });

    const app = renderApp({ callback: { appState } });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe('/');
  });
});

describe('a session that cannot be renewed', () => {
  it.each([
    ['Auth0 forgets the person before reporting the failure', true],
    ['the application closes the session after the failure', false],
  ])(
    'ends at the access screen with the expired notice and the way back, when %s (FR-013, US4-1)',
    async (_label, sdkForgetsFirst) => {
      createUsersServiceMock({ [SUB]: marketing });
      const app = renderApp({ url: '/profile?page=2', signedIn: true });
      await screen.findByRole('heading', { level: 1, name: messages.profile.title });

      app.getTokenSilently.mockImplementation(() => {
        if (sdkForgetsFirst) {
          app.forgetSession();
        }
        return Promise.reject(new GenericError('login_required', 'Login required'));
      });
      returnToTab();

      expect(
        await screen.findByRole('heading', { level: 1, name: messages.access.title }),
      ).toBeInTheDocument();
      await settle();
      expect(app.router.state.location.pathname).toBe('/access');
      expect(app.router.state.location.state).toEqual({ returnTo: '/profile?page=2' });
      expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.expired);
    },
  );
});

describe('another tab ends the session', () => {
  it('takes this tab to the access screen, and lets it come back to where it was (US3-4)', async () => {
    createUsersServiceMock({ [SUB]: marketing });
    const app = renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { level: 1, name: messages.profile.title });

    otherTab().post({ type: 'session-ended', reason: 'logout' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    await settle();
    expect(app.router.state.location.pathname).toBe('/access');
    expect(app.router.state.location.state).toEqual({ returnTo: '/profile' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(app.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
  });

  it('says why when the other tab was closed for inactivity (FR-020)', async () => {
    createUsersServiceMock({ [SUB]: marketing });
    const app = renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { level: 1, name: messages.profile.title });

    otherTab().post({ type: 'session-ended', reason: 'idle' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    await settle();
    expect(app.router.state.location.pathname).toBe('/access');
    expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.idle);
  });

  it('also takes a tab that shows the access denied screen (FR-010)', async () => {
    const service = createUsersServiceMock({ [SUB]: ownerOnly });
    const app = renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { level: 1, name: messages.denied.title });

    otherTab().post({ type: 'session-ended', reason: 'logout' });

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeInTheDocument();
    await settle();
    expect(app.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    const requestsAfterLeaving = service.requestCount;
    returnToTab();
    await settle();
    expect(service.requestCount).toBe(requestsAfterLeaving);
  });
});

describe('the screens that the guard shows', () => {
  it('give the document a title of their own (WCAG 2.4.2)', async () => {
    const service = createUsersServiceMock({ [SUB]: marketing });
    renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { level: 1, name: messages.profile.title });
    expect(document.title).toBe(`${messages.titles.profile} — ${messages.common.appName}`);

    service.setStatus(SUB, { id: 2, name: 'Bloqueado' });
    returnToTab();

    await screen.findByRole('heading', { level: 1, name: messages.denied.title });
    // "Sin acceso" (feature 006): the tab title is shorter than the h1 (research D5/I1).
    expect(document.title).toBe(`${messages.denied.tabTitle} — ${messages.common.appName}`);
  });

  it('also close the session for inactivity', async () => {
    createUsersServiceMock({ [SUB]: ownerOnly });
    // The idle timer keeps the timers it found when it was loaded: point it at the fake ones.
    vi.useFakeTimers();
    createMocks();
    const app = renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { name: messages.denied.title }, { timeout: 20_000 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000);
    });

    expect(app.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access/idle` },
    });
  }, 30_000);
});

describe('logging out from the header', () => {
  it('keeps the page steady until the browser leaves, and asks nothing more of the service', async () => {
    const service = createUsersServiceMock({ [SUB]: marketing });
    const app = renderApp({ url: '/profile', signedIn: true });
    await screen.findByRole('heading', { level: 1, name: messages.profile.title });
    const requestsBefore = service.requestCount;

    await app.user.click(screen.getByRole('button', { name: messages.common.logout }));
    await settle();

    expect(app.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
    expect(screen.getByRole('heading', { level: 1, name: messages.profile.title })).toBeVisible();
    expect(service.requestCount).toBe(requestsBefore);
  });
});
