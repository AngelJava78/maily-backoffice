import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import { auth0User } from '@/test/auth0Double';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TokenPage } from './TokenPage';

const text = messages.token;
const START = new Date('2026-10-19T12:00:00Z');
const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

/** A token that expires this many seconds after the (fake) present. */
function tokenExpiringIn(seconds: number): string {
  return fakeAccessToken({ exp: Math.floor(Date.now() / 1000) + seconds });
}

const expiryOf = (seconds: number) =>
  formatDateTime(new Date(Date.now() + seconds * 1000).toISOString());
const getButton = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });

function renderPage() {
  return renderWithProviders(<TokenPage />, { auth0: SIGNED_IN });
}

describe('TokenPage: the token expires while the page is open (user story 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Vigente" with "Copiar" after generating, and announces the expiry (US4-1)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(tokenExpiringIn(120));

    await user.click(getButton(text.actions.generate));

    expect(await screen.findByText(text.validity.valid)).toBeInTheDocument();
    expect(getButton(text.actions.copy)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(text.announce.generated(expiryOf(120)));
  });

  it('turns into "Expirado" by itself when the time comes: no "Copiar", it is announced, the rest stays (US4-2, FR-013)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(tokenExpiringIn(120));
    await user.click(getButton(text.actions.generate));
    await screen.findByText(text.validity.valid);

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(await screen.findByText(text.validity.expired)).toBeInTheDocument();
    expect(screen.queryByText(text.validity.valid)).not.toBeInTheDocument();
    expect(queryButton(text.actions.copy)).not.toBeInTheDocument();
    expect(getButton(text.actions.show)).toBeInTheDocument();
    expect(getButton(text.actions.refresh)).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(text.announce.expired);
  });

  it('a new token after it expired is "Vigente" again, with "Copiar" and without the expired notice (US4-3)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently
      .mockResolvedValueOnce(tokenExpiringIn(120))
      .mockResolvedValueOnce(tokenExpiringIn(3_600));
    await user.click(getButton(text.actions.generate));
    await screen.findByText(text.validity.valid);
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    await screen.findByText(text.validity.expired);

    await user.click(getButton(text.actions.refresh));

    expect(await screen.findByText(text.validity.valid)).toBeInTheDocument();
    expect(getButton(text.actions.copy)).toBeInTheDocument();
    expect(screen.queryByText(text.validity.expired)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent(text.announce.expired);
  });

  it('shows a token that arrives already expired as "Expirado" at once, without "Copiar"', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(tokenExpiringIn(-60));

    await user.click(getButton(text.actions.generate));

    expect(await screen.findByText(text.validity.expired)).toBeInTheDocument();
    expect(queryButton(text.actions.copy)).not.toBeInTheDocument();
    expect(getButton(text.actions.refresh)).toBeEnabled();
  });

  it('notices that the time passed while the tab was in the background when the person comes back (research D8)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(tokenExpiringIn(120));
    await user.click(getButton(text.actions.generate));
    await screen.findByText(text.validity.valid);

    // The clock moves on but the timers of a hidden tab are late: nothing has fired yet.
    vi.setSystemTime(START.getTime() + 200_000);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByText(text.validity.expired)).toBeInTheDocument();
    expect(queryButton(text.actions.copy)).not.toBeInTheDocument();
  });
});
