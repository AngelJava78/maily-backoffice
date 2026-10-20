import { GenericError } from '@auth0/auth0-react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import { auth0User } from '@/test/auth0Double';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TokenPage } from './TokenPage';

const text = messages.token;
const SIGNED_IN = { isAuthenticated: true, user: auth0User() };
const TOKEN = fakeAccessToken({ exp: 1_900_000_000 });
const TOKEN_EXPIRY = formatDateTime('2030-03-17T17:46:40.000Z');

const field = () => screen.getByRole('textbox', { name: text.fields.token });
const getButton = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });

function renderPage() {
  return renderWithProviders(<TokenPage />, { auth0: SIGNED_IN });
}

describe('TokenPage when the token cannot be obtained or copied (FR-016, FR-019)', () => {
  beforeEach(() => {
    // `logger.error` reaches the console; the tests that check what it receives are elsewhere.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('stays in its initial state with an alert and "Reintentar" when the first "Generar" fails', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockRejectedValueOnce(new Error('boom'));

    await user.click(getButton(text.actions.generate));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.errors.unknown.title);
    expect(getButton(messages.common.retry)).toBeInTheDocument();
    expect(getButton(text.actions.generate)).toBeEnabled();
    expect(queryButton(text.actions.refresh)).not.toBeInTheDocument();
    expect(field()).toHaveValue('');
  });

  it('shows the token when "Reintentar" works, and the alert goes away', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(TOKEN);
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('alert');

    await user.click(getButton(messages.common.retry));

    expect(await screen.findByRole('button', { name: text.actions.refresh })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(field()).toHaveValue(text.mask);
  });

  it('keeps the token that was on screen, with its expiry, when "Refrescar" fails', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently
      .mockResolvedValueOnce(TOKEN)
      .mockRejectedValueOnce(new Error('boom'));
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });
    await user.click(getButton(text.actions.show));

    await user.click(getButton(text.actions.refresh));

    expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.unknown.title);
    expect(field()).toHaveValue(TOKEN);
    expect(screen.getByText(TOKEN_EXPIRY)).toBeInTheDocument();
    expect(getButton(text.actions.refresh)).toBeEnabled();
  });

  it('says the token could not be read, and shows none, when the answer is not a token', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValueOnce('no-es-un-jwt');

    await user.click(getButton(text.actions.generate));

    expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.unreadableToken.title);
    expect(field()).toHaveValue('');
    expect(document.body.innerHTML).not.toContain('no-es-un-jwt');
  });

  it('offers to sign in again when the session ended, and does it through the session expiry (FR-019)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockRejectedValueOnce(
      new GenericError('login_required', 'Login required'),
    );

    await user.click(getButton(text.actions.generate));

    expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.sessionExpired.title);
    expect(getButton(messages.common.retry)).toBeInTheDocument();

    await user.click(getButton(text.actions.signInAgain));

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
  });

  it('does not offer to sign in again for the failures that do not end the session', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockRejectedValueOnce(new Error('boom'));

    await user.click(getButton(text.actions.generate));
    await screen.findByRole('alert');

    expect(queryButton(text.actions.signInAgain)).not.toBeInTheDocument();
  });

  it('never shows the message of the original error', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockRejectedValueOnce(new Error('boom secret detail'));

    await user.click(getButton(text.actions.generate));
    await screen.findByRole('alert');

    expect(document.body).not.toHaveTextContent('boom');
    expect(document.body).not.toHaveTextContent('secret');
  });

  it('says it could not copy, keeps the token hidden and lets the person select it with "Mostrar" (research D9)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(TOKEN);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });

    await user.click(getButton(text.actions.copy));

    expect(await screen.findByText(text.copyFailed)).toBeInTheDocument();
    expect(field()).toHaveValue(text.mask);

    await user.click(getButton(text.actions.show));
    expect(field()).toHaveValue(TOKEN);
  });
});
