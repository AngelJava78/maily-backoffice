import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import { auth0User } from '@/test/auth0Double';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TokenPage } from './TokenPage';

const text = messages.token;
const SIGNED_IN = { isAuthenticated: true, user: auth0User() };
const TOKEN = fakeAccessToken({ exp: 1_900_000_000 });

function renderPage() {
  return renderWithProviders(<TokenPage />, { auth0: SIGNED_IN });
}

describe('TokenPage accessibility (constitution VI)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('has no violations in its initial state', async () => {
    const { container } = renderPage();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with a hidden token and with a visible one', async () => {
    const { container, user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(TOKEN);
    await user.click(screen.getByRole('button', { name: text.actions.generate }));
    await screen.findByRole('button', { name: text.actions.refresh });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: text.actions.show }));

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with a failure alert', async () => {
    const { container, user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockRejectedValueOnce(new Error('boom'));
    await user.click(screen.getByRole('button', { name: text.actions.generate }));
    await screen.findByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
