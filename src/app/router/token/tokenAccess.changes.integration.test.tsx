import { GenericError } from '@auth0/auth0-react';
import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor, within } from '@testing-library/react';
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

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await import('@/features/postman-token');
}, 90_000);

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

/** Coming back to the tab checks the permissions again (feature 001, FR-019). */
function checkPermissionsAgain(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

const navigation = () => screen.getByRole('navigation', { name: messages.nav.label });
const tokenLink = () =>
  within(navigation()).queryByRole('link', { name: messages.nav.sections.token });
const field = () => screen.getByRole('textbox', { name: text.fields.token });

describe(
  'the Token tool: what happens when the permissions change (feature 005, user story 2)',
  { timeout: 30_000 },
  () => {
    it('closes the tool and discards the token when the permission is taken away with it open (US2-8, FR-018)', async () => {
      const mock = start();
      mock.grant('Administrator', 'token:read');
      const { user, router } = open('/tools/postman-token');
      await user.click(await screen.findByRole('button', { name: text.actions.generate }));
      await user.click(await screen.findByRole('button', { name: text.actions.show }));
      expect(field()).toHaveValue(TOKEN);

      mock.revoke('Administrator', 'token:read');
      checkPermissionsAgain();

      expect(await screen.findByText(text.noPermission)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
      expect(tokenLink()).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue(TOKEN)).not.toBeInTheDocument();
      expect(document.body.innerHTML).not.toContain(TOKEN);
    });

    it('does not tell who only has the tool that they have no permissions (feature 001, FR-018)', async () => {
      const mock = start([4]);
      mock.revoke('Marketing', 'tenants:read');
      mock.grant('Marketing', 'token:read');
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).toBeInTheDocument();
      expect(screen.queryByText(messages.home.noPermissionsTitle)).not.toBeInTheDocument();
    });

    it('does tell it to who has no permission at all', async () => {
      start([2]);
      open('/');

      expect(await screen.findByText(messages.home.noPermissionsTitle)).toBeInTheDocument();
    });

    it('keeps the tool, and the token on screen, when a later check of the permissions fails, and closes it when a check works and the permission is gone (FR-003)', async () => {
      const mock = start();
      mock.grant('Administrator', 'token:read');
      const { user, router } = open('/tools/postman-token');
      await user.click(await screen.findByRole('button', { name: text.actions.generate }));
      await screen.findByRole('button', { name: text.actions.refresh });
      const before = mock.requestsTo('GET', '/api/v1/authorization/me').length;

      // A 400 is not retried by the HTTP client, so this check fails at once.
      mock.failNext({
        method: 'GET',
        path: '/api/v1/authorization/me',
        status: 400,
        code: 'bad_request',
      });
      checkPermissionsAgain();
      await waitFor(() => {
        expect(mock.requestsTo('GET', '/api/v1/authorization/me')).toHaveLength(before + 1);
      });
      // Time for the failure to reach the screen, if it were going to do anything to it.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(router.state.location.pathname).toBe('/tools/postman-token');
      expect(field()).toHaveValue(text.mask);
      expect(tokenLink()).toBeInTheDocument();
      expect(screen.queryByText(text.noPermission)).not.toBeInTheDocument();

      mock.revoke('Administrator', 'token:read');
      checkPermissionsAgain();

      expect(await screen.findByText(text.noPermission)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
    });

    it('ends the session and goes to the access screen with the return route when the session cannot be renewed (constitution V, exception of v1.2.0)', async () => {
      start().grant('Administrator', 'token:read');
      const { user, router, logout, getTokenSilently } = open('/tools/postman-token');
      await screen.findByRole('heading', { level: 1, name: text.title });
      getTokenSilently.mockImplementation((options) =>
        options?.cacheMode === 'off'
          ? Promise.reject(new GenericError('login_required', 'Login required'))
          : Promise.resolve(`test-token:${ADMIN_SUB}`),
      );

      await user.click(screen.getByRole('button', { name: text.actions.generate }));

      expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.sessionExpired.title);
      expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: text.actions.signInAgain }));

      expect(logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/access');
      });
      expect(router.state.location.state).toEqual({ returnTo: '/tools/postman-token' });
      expect(screen.queryByRole('heading', { level: 1, name: text.title })).not.toBeInTheDocument();
    });
  },
);
