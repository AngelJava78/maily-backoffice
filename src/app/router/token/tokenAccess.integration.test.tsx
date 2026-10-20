import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { ADMIN_ID } from '@/test/handlers/usersDirectory/seed';
import { renderApp } from '@/test/renderApp';

const text = messages.token;
const TOKEN = fakeAccessToken({ exp: 1_900_000_000 });

// The screen of the tool is a lazy chunk: load it here so that no test pays for it while it waits.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await import('@/features/postman-token');
}, 90_000);

/**
 * The service with the default directory, whose operator is an Administrator that does not have
 * `token:read` (each test grants what it needs), or with the roles of the operator replaced by
 * those ids (2 Developer, 3 Owner, 4 Marketing, 5 Billing).
 */
function start(roleIds?: readonly number[]) {
  const base = defaultDirectory();
  return createUsersDirectoryMock(
    roleIds === undefined
      ? base
      : { ...base, associations: roleIds.map((roleId) => ({ userId: ADMIN_ID, roleId })) },
  );
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true, freshAccessToken: TOKEN });
}

const navigation = () => screen.getByRole('navigation', { name: messages.nav.label });
const tokenLink = () =>
  within(navigation()).queryByRole('link', { name: messages.nav.sections.token });
const toolHeading = () => screen.queryByRole('heading', { level: 1, name: text.title });

/** Whether any request for a token went out with `cacheMode: 'off'`, as "Generar" does. */
function askedForNewToken(
  calls: readonly (readonly [{ readonly cacheMode?: string }?])[],
): boolean {
  return calls.some(([options]) => options?.cacheMode === 'off');
}

describe(
  'the Token tool: who sees it and who can open it (feature 005, user story 2)',
  { timeout: 30_000 },
  () => {
    it('lists the tool for who has token:read in a role and opens it from the navigation (US2-1, FR-001)', async () => {
      start().grant('Administrator', 'token:read');
      const { user, router } = open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      await user.click(
        within(navigation()).getByRole('link', { name: messages.nav.sections.token }),
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: text.title }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/tools/postman-token');
      expect(document.title).toBe(`${messages.titles.token} — ${messages.common.appName}`);
    });

    it('does not list it for who lacks token:read, although the rest of their sections are there (US2-2, FR-004)', async () => {
      start();
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(
        within(navigation()).getByRole('link', { name: messages.nav.sections.users }),
      ).toBeInTheDocument();
      expect(tokenLink()).not.toBeInTheDocument();
    });

    it('counts the permission and not the name of the role: Marketing with token:read sees it (US2-3)', async () => {
      start([4]).grant('Marketing', 'token:read');
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).toBeInTheDocument();
    });

    it('counts the permission and not the name of the role: Developer without it does not, and is told it has no permissions (US2-3)', async () => {
      start([2]);
      open('/');

      expect(await screen.findByText(messages.home.noPermissionsTitle)).toBeInTheDocument();
      expect(tokenLink()).not.toBeInTheDocument();
    });

    it('lists it when one of several roles has the permission (US2-4)', async () => {
      start([2, 4]).grant('Marketing', 'token:read');
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).toBeInTheDocument();
    });

    it('does not count the permission of a blocked role (US2-5, FR-004)', async () => {
      const mock = start([2, 4]);
      mock.grant('Marketing', 'token:read');
      mock.setRoleStatus(4, 2);
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).not.toBeInTheDocument();
    });

    it('does not count the permission of a role that is not a system role, even next to one that is (FR-004, feature 001)', async () => {
      start([4, 3]).grant('Owner', 'token:read');
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).not.toBeInTheDocument();
    });

    it('sends who opens the address without the permission to the home page, with the notice of the tool, session open and no token asked for (US2-6, FR-005)', async () => {
      start();
      const { router, logout, getTokenSilently } = open('/tools/postman-token');

      expect(await screen.findByText(text.noPermission)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
      expect(toolHeading()).not.toBeInTheDocument();
      expect(screen.queryByText(messages.home.permissionsChanged)).not.toBeInTheDocument();
      expect(logout).not.toHaveBeenCalled();
      expect(askedForNewToken(getTokenSilently.mock.calls)).toBe(false);
    });

    it('shows neither the tool nor the link while the permissions are still being resolved (US2-7, FR-003)', async () => {
      const mock = start();
      mock.grant('Administrator', 'token:read');
      const release = mock.defer();
      const { getTokenSilently } = open('/tools/postman-token');

      await waitFor(() => {
        expect(mock.requestsTo('GET', '/api/v1/authorization/me')).toHaveLength(1);
      });
      expect(toolHeading()).not.toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: messages.nav.label }),
      ).not.toBeInTheDocument();
      expect(askedForNewToken(getTokenSilently.mock.calls)).toBe(false);

      release();

      expect(
        await screen.findByRole('heading', { level: 1, name: text.title }),
      ).toBeInTheDocument();
    });

    it('asks to sign in first, and shows no token, to who has no session (US2-9)', async () => {
      start().grant('Administrator', 'token:read');
      const { router } = renderApp({ url: '/tools/postman-token' });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/access');
      });
      expect(router.state.location.state).toEqual({ returnTo: '/tools/postman-token' });
      expect(toolHeading()).not.toBeInTheDocument();
    });

    it('shows nothing of the tool when the permissions could not be resolved even once, and works after trying again (FR-003)', async () => {
      const mock = start();
      mock.grant('Administrator', 'token:read');
      // A 400 is not retried by the HTTP client, so the failure shows at once.
      mock.failNext({
        method: 'GET',
        path: '/api/v1/authorization/me',
        status: 400,
        code: 'bad_request',
      });
      const { user, getTokenSilently } = open('/tools/postman-token');

      expect(await screen.findByText(messages.checkFailed.title)).toBeInTheDocument();
      expect(toolHeading()).not.toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: messages.nav.label }),
      ).not.toBeInTheDocument();
      expect(askedForNewToken(getTokenSilently.mock.calls)).toBe(false);

      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      expect(
        await screen.findByRole('heading', { level: 1, name: text.title }),
      ).toBeInTheDocument();
    });
  },
);
