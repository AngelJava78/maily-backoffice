import { act, fireEvent, screen } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { fakeAccessToken } from '@/test/accessToken';
import { auth0User } from '@/test/auth0Double';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TokenPage } from './TokenPage';

const text = messages.token;
const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

// They expire on 2030-03-17 and 2030-03-18 at 17:46:40 UTC.
const FIRST = fakeAccessToken({ exp: 1_900_000_000 });
const SECOND = fakeAccessToken({ exp: 1_900_086_400 });
const FIRST_EXPIRY = formatDateTime('2030-03-17T17:46:40.000Z');
const SECOND_EXPIRY = formatDateTime('2030-03-18T17:46:40.000Z');

function renderPage() {
  return renderWithProviders(<TokenPage />, { auth0: SIGNED_IN });
}

/** A promise that the test settles when it wants. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

const field = () => screen.getByRole('textbox', { name: text.fields.token });
const getButton = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });
const buttonNames = () => screen.queryAllByRole('button').map((button) => button.textContent);

describe('TokenPage', () => {
  it('opens in its initial state: empty spaces, only "Generar", the warning and no request (US1-1, FR-009)', () => {
    const { auth0 } = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: text.title })).toHaveFocus();
    expect(screen.getByRole('note')).toHaveTextContent(text.warning);
    expect(field()).toHaveValue('');
    expect(screen.getByText(text.emptyExpiry)).toBeInTheDocument();
    expect(buttonNames()).toEqual([text.actions.generate]);
    expect(auth0.getAccessTokenSilently).not.toHaveBeenCalled();
  });

  it('generates a token: the button waits with a progress indicator, then the token appears hidden with its expiry and "Refrescar" (US1-2, 5, 6; FR-016)', async () => {
    const { user, auth0 } = renderPage();
    const answer = deferred<string>();
    auth0.getAccessTokenSilently.mockReturnValue(answer.promise);

    await user.click(getButton(text.actions.generate));

    expect(auth0.getAccessTokenSilently).toHaveBeenCalledExactlyOnceWith({ cacheMode: 'off' });
    expect(getButton(text.actions.generate)).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await act(async () => {
      answer.resolve(FIRST);
      await answer.promise;
    });

    expect(await screen.findByRole('button', { name: text.actions.refresh })).toBeEnabled();
    expect(queryButton(text.actions.generate)).not.toBeInTheDocument();
    expect(field()).toHaveValue(text.mask);
    expect(screen.getByText(FIRST_EXPIRY)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(FIRST);
    expect(screen.queryByDisplayValue(FIRST)).not.toBeInTheDocument();
  });

  it('shows the whole token with "Mostrar" and hides it again with "Ocultar" (US1-3)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(FIRST);
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });

    await user.click(getButton(text.actions.show));
    expect(field()).toHaveValue(FIRST);

    await user.click(getButton(text.actions.hide));
    expect(field()).toHaveValue(text.mask);
    expect(document.body.innerHTML).not.toContain(FIRST);
  });

  it('copies the whole token without showing it and confirms it (US1-4, FR-011)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(FIRST);
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });

    await user.click(getButton(text.actions.copy));

    await expect(navigator.clipboard.readText()).resolves.toBe(FIRST);
    expect(await screen.findByText(text.copied)).toBeInTheDocument();
    expect(field()).toHaveValue(text.mask);
  });

  it('refreshing asks for another token, replaces the one on screen, hides it and updates the expiry (US1-7, FR-015)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValueOnce(FIRST).mockResolvedValueOnce(SECOND);
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });
    await user.click(getButton(text.actions.show));
    expect(field()).toHaveValue(FIRST);

    await user.click(getButton(text.actions.refresh));

    expect(await screen.findByText(SECOND_EXPIRY)).toBeInTheDocument();
    expect(screen.queryByText(FIRST_EXPIRY)).not.toBeInTheDocument();
    expect(field()).toHaveValue(text.mask);
    expect(getButton(text.actions.refresh)).toBeEnabled();
    expect(auth0.getAccessTokenSilently).toHaveBeenCalledTimes(2);
    expect(auth0.getAccessTokenSilently).toHaveBeenNthCalledWith(2, { cacheMode: 'off' });
  });

  it('makes a single request when "Generar" is pressed twice in a row (FR-016)', async () => {
    const { auth0 } = renderPage();
    const answer = deferred<string>();
    auth0.getAccessTokenSilently.mockReturnValue(answer.promise);

    // `userEvent` does not press a Material UI button that is loading; `fireEvent` does.
    fireEvent.click(getButton(text.actions.generate));
    fireEvent.click(getButton(text.actions.generate));

    expect(auth0.getAccessTokenSilently).toHaveBeenCalledOnce();

    await act(async () => {
      answer.resolve(FIRST);
      await answer.promise;
    });
    expect(await screen.findByRole('button', { name: text.actions.refresh })).toBeEnabled();
  });

  it('keeps the security warning visible with and without a token (US1-10, FR-017)', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(FIRST);
    expect(screen.getByRole('note')).toHaveTextContent(text.warning);

    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });

    expect(screen.getByRole('note')).toHaveTextContent(text.warning);
  });

  it('offers no control for another person or an application (US1-11, FR-008)', () => {
    renderPage();

    expect(buttonNames()).toEqual([text.actions.generate]);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('announces the token to a screen reader when it arrives', async () => {
    const { user, auth0 } = renderPage();
    auth0.getAccessTokenSilently.mockResolvedValue(FIRST);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await user.click(getButton(text.actions.generate));

    expect(await screen.findByText(text.announce.generated(FIRST_EXPIRY))).toBeInTheDocument();
  });

  it('starts again from the initial state when the person leaves and comes back (US1-9, FR-018)', async () => {
    const routes: RouteObject[] = [
      { path: '/tools/postman-token', element: <TokenPage /> },
      { path: '/profile', element: <p>Perfil</p> },
    ];
    const { user, auth0, router } = renderWithProviders(routes, {
      route: '/tools/postman-token',
      auth0: SIGNED_IN,
    });
    auth0.getAccessTokenSilently.mockResolvedValue(FIRST);
    await user.click(getButton(text.actions.generate));
    await screen.findByRole('button', { name: text.actions.refresh });

    await act(() => router.navigate('/profile'));
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    await act(() => router.navigate('/tools/postman-token'));

    expect(field()).toHaveValue('');
    expect(buttonNames()).toEqual([text.actions.generate]);
    expect(screen.getByText(text.emptyExpiry)).toBeInTheDocument();
    expect(auth0.getAccessTokenSilently).toHaveBeenCalledOnce();
  });
});
