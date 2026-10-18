import { Auth0Context } from '@auth0/auth0-react';
import { ThemeProvider } from '@mui/material/styles';
import { useMutation, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';
import { NotificationsProvider } from '@/shared/ui/Notifications';
import { createAuth0Double } from '@/test/auth0Double';

import { theme } from '../theme/theme';
import { AppQueryProvider } from './AppQueryProvider';

function forbidden() {
  return ApiError.fromResponse(403, { code: 'forbidden', message: 'Sin permiso' });
}

function FailingQuery() {
  useQuery({ queryKey: ['things'], queryFn: () => Promise.reject(forbidden()), retry: false });
  return null;
}

function FailingMutation() {
  const mutation = useMutation({ mutationFn: () => Promise.reject(forbidden()) });
  return (
    <button
      type="button"
      onClick={() => {
        mutation.mutate();
      }}
    >
      Save
    </button>
  );
}

function renderInsideApp(child: ReactElement) {
  const auth0 = createAuth0Double({ isAuthenticated: true });
  render(
    <Auth0Context.Provider value={auth0}>
      <ThemeProvider theme={theme}>
        <NotificationsProvider>
          <AppQueryProvider>{child}</AppQueryProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </Auth0Context.Provider>,
  );
  return auth0;
}

describe('a 403 from the platform services (FR-014, US2-6)', () => {
  it('shows a notice when a query is refused, and keeps the session', async () => {
    const auth0 = renderInsideApp(<FailingQuery />);

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.forbidden.action);
    expect(auth0.mocks.logout).not.toHaveBeenCalled();
  });

  it('shows a notice when a mutation is refused, and keeps the session', async () => {
    const user = userEvent.setup();
    const auth0 = renderInsideApp(<FailingMutation />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.forbidden.action);
    expect(auth0.mocks.logout).not.toHaveBeenCalled();
  });
});
