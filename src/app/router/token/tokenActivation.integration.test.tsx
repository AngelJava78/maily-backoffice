import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

const text = messages.token;
const TOKEN = fakeAccessToken({ exp: 1_900_000_000 });

// The screens of the tool and of the users are lazy chunks: load them here so that no test pays for
// it while it waits for a screen.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/postman-token'),
    import('@/features/users/components/UsersListPage'),
  ]);
}, 90_000);

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

// The permission is the only switch of the tool, and the simulator starts with nobody having it: it
// is "off" by default (FR-006). These tests prove it works with data alone, so they pass with no
// variable of the tool anywhere, as the application is built.
describe(
  'the Token tool is switched on and off with data alone (feature 005, user story 3)',
  { timeout: 30_000 },
  () => {
    it('does not exist for anyone while no role has the permission, and its address sends back home (US3-1)', async () => {
      createUsersDirectoryMock();
      const { router } = open('/tools/postman-token');

      expect(await screen.findByText(text.noPermission)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
      expect(tokenLink()).not.toBeInTheDocument();
    });

    it('appears, without reloading, when the permission is given to a role, and works (US3-2)', async () => {
      const mock = createUsersDirectoryMock();
      const { user } = open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });
      const sameNavigation = navigation();
      expect(tokenLink()).not.toBeInTheDocument();

      mock.grant('Administrator', 'token:read');
      checkPermissionsAgain();

      await waitFor(() => {
        expect(tokenLink()).toBeInTheDocument();
      });
      expect(navigation()).toBe(sameNavigation);
      await user.click(
        within(navigation()).getByRole('link', { name: messages.nav.sections.token }),
      );
      await user.click(await screen.findByRole('button', { name: text.actions.generate }));
      expect(await screen.findByRole('button', { name: text.actions.refresh })).toBeEnabled();
    });

    it('disappears when the permission is taken away from the role (US3-3)', async () => {
      const mock = createUsersDirectoryMock();
      mock.grant('Administrator', 'token:read');
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });
      expect(tokenLink()).toBeInTheDocument();

      mock.revoke('Administrator', 'token:read');
      checkPermissionsAgain();

      await waitFor(() => {
        expect(tokenLink()).not.toBeInTheDocument();
      });
    });

    it('is decided by the data of each environment, not by the environment: the same build shows it only where the role has the permission (US3-4, SC-009)', async () => {
      createUsersDirectoryMock().grant('Administrator', 'token:read');
      const withPermission = open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });
      expect(tokenLink()).toBeInTheDocument();
      withPermission.unmount();

      createUsersDirectoryMock();
      open('/');
      await screen.findByRole('navigation', { name: messages.nav.label });

      expect(tokenLink()).not.toBeInTheDocument();
    });

    it.each([
      ['with the tool switched on', true],
      ['with the tool switched off', false],
    ])(
      'leaves the users section and the profile as they are %s (US3-5, FR-020, SC-006)',
      async (_label, on) => {
        const mock = createUsersDirectoryMock();
        if (on) {
          mock.grant('Administrator', 'token:read');
        }
        const first = open('/users');
        expect(
          await screen.findByRole('heading', { level: 1, name: messages.users.title }),
        ).toBeInTheDocument();
        expect(
          await screen.findByRole('grid', { name: messages.users.list.gridLabel }),
        ).toBeInTheDocument();
        first.unmount();

        open('/profile');
        expect(
          await screen.findByRole('heading', { level: 1, name: messages.profile.title }),
        ).toBeInTheDocument();
      },
    );
  },
);
