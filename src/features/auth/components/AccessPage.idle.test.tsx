import { screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { AnnounceSessionNotice } from '@/test/AnnounceSessionNotice';
import { renderWithProviders } from '@/test/renderWithProviders';

import { consumeReturnPath, saveReturnPath } from '../session/returnPathStorage';
import { AccessPage } from './AccessPage';

const routes: RouteObject[] = [
  { path: '/access/idle', element: <AccessPage idle /> },
  { path: '/access', element: <AccessPage /> },
];

describe('AccessPage after being closed for inactivity', () => {
  it('shows the inactivity notice (US4-2)', () => {
    renderWithProviders(routes, { route: '/access/idle' });

    expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.idle);
    expect(screen.getByRole('button', { name: messages.access.loginButton })).toBeInTheDocument();
  });

  it('says it was the inactivity even if another notice was announced', () => {
    renderWithProviders(
      [
        {
          path: '/access/idle',
          element: (
            <AnnounceSessionNotice notice="expired">
              <AccessPage idle />
            </AnnounceSessionNotice>
          ),
        },
      ],
      { route: '/access/idle' },
    );

    expect(screen.getByRole('alert')).toHaveTextContent(messages.access.notices.idle);
    expect(screen.queryByText(messages.access.notices.expired)).not.toBeInTheDocument();
  });

  it('comes back to the screen where the person was, which it reads once', async () => {
    saveReturnPath({ pathname: '/profile', search: '?page=3&q=secret' });
    const { user, auth0 } = renderWithProviders(routes, { route: '/access/idle' });

    await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

    expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/profile?page=3' },
    });
    expect(consumeReturnPath()).toBe('/');
  });

  it('comes back to the home page when nothing was remembered', async () => {
    const { user, auth0 } = renderWithProviders(routes, { route: '/access/idle' });

    await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

    expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/' },
    });
  });

  it('ignores the return address of the router state, which belongs to other flows', async () => {
    saveReturnPath({ pathname: '/profile', search: '' });
    const { user, auth0 } = renderWithProviders(routes, {
      initialEntries: [{ pathname: '/access/idle', state: { returnTo: '/somewhere-else' } }],
    });

    await user.click(screen.getByRole('button', { name: messages.access.loginButton }));

    expect(auth0.loginWithRedirect).toHaveBeenCalledExactlyOnceWith({
      appState: { returnTo: '/profile' },
    });
  });

  it('leaves the stored address alone on the normal access screen', () => {
    saveReturnPath({ pathname: '/profile', search: '' });

    renderWithProviders(routes, { route: '/access' });

    expect(consumeReturnPath()).toBe('/profile');
  });
});
