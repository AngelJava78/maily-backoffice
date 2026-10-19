import { OAuthError } from '@auth0/auth0-react';
import { screen } from '@testing-library/react';
import { useLocation, type RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CallbackPage } from './CallbackPage';

function AccessProbe() {
  return <p>Access screen ({JSON.stringify(useLocation().state)})</p>;
}

const routes: RouteObject[] = [
  { path: '/callback', element: <CallbackPage /> },
  { path: '/access', element: <AccessProbe /> },
  { path: '/', element: <p>Protected home</p> },
];

describe('CallbackPage', () => {
  it('shows the progress while the SDK completes the sign-in', () => {
    renderWithProviders(routes, { route: '/callback', auth0: { isLoading: true } });

    expect(screen.getByText(messages.callback.progress)).toBeInTheDocument();
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();
  });

  it('reports a cancelled sign-in when the person denies access at the provider', () => {
    const { router } = renderWithProviders(routes, {
      route: '/callback',
      auth0: { error: new OAuthError('access_denied', 'The user cancelled') },
    });

    expect(router.state.location.pathname).toBe('/access');
    expect(router.state.location.state).toEqual({ notice: 'cancelled' });
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();
  });

  it.each([
    ['another OAuth error', new OAuthError('server_error', 'Something broke')],
    ['an error that is not an OAuth error', new Error('boom')],
  ])('reports a provider error for %s (FR-015)', (_label, error) => {
    const { router } = renderWithProviders(routes, { route: '/callback', auth0: { error } });

    expect(router.state.location.pathname).toBe('/access');
    expect(router.state.location.state).toEqual({ notice: 'idpError' });
  });

  it('goes to the home page when there is nothing to complete', () => {
    const { router } = renderWithProviders(routes, { route: '/callback' });

    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText(messages.callback.progress)).not.toBeInTheDocument();
  });

  it('keeps waiting while the address still has the code and state, even if the SDK stopped loading', () => {
    // The SDK reports the end of the loading before the router leaves the callback address.
    const { router } = renderWithProviders(routes, {
      route: '/callback?code=abc&state=xyz',
      auth0: { isLoading: false },
    });

    expect(screen.getByText(messages.callback.progress)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/callback');
  });

  it.each(['?code=abc', '?state=xyz', '?error=boom'])(
    'does not wait for a sign-in that cannot be coming back from Auth0 (%s)',
    (search) => {
      const { router } = renderWithProviders(routes, { route: `/callback${search}` });

      expect(router.state.location.pathname).toBe('/');
    },
  );
});
