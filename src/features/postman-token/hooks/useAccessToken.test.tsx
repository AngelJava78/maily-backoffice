import { GenericError } from '@auth0/auth0-react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/shared/lib/logger';
import { fakeAccessToken, FAKE_TOKEN_EXP } from '@/test/accessToken';
import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { useAccessToken } from './useAccessToken';

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

function setup() {
  const harness = createWrapper({ auth0: SIGNED_IN });
  const hook = renderHook(() => useAccessToken(), { wrapper: harness.wrapper });
  return { ...harness, ...hook };
}

/** A promise that the test settles when it wants. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('useAccessToken', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty and asks Auth0 for nothing until the person requests a token (FR-009)', () => {
    const { result, auth0 } = setup();

    expect(result.current).toMatchObject({
      token: null,
      revealed: false,
      isPending: false,
      failure: null,
      isExpired: false,
    });
    expect(auth0.getAccessTokenSilently).not.toHaveBeenCalled();
  });

  it('asks Auth0 for a new token and keeps it hidden when it arrives (FR-010, FR-015)', async () => {
    const { result, auth0 } = setup();
    const token = fakeAccessToken({ exp: FAKE_TOKEN_EXP });
    const answer = deferred<string>();
    auth0.getAccessTokenSilently.mockReturnValue(answer.promise);

    act(() => {
      result.current.request();
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      answer.resolve(token);
      await answer.promise;
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.token).toEqual({ value: token, expiresAt: '2030-03-17T17:46:40.000Z' });
    expect(result.current.revealed).toBe(false);
    expect(auth0.getAccessTokenSilently).toHaveBeenCalledExactlyOnceWith({ cacheMode: 'off' });
  });

  it('refreshing asks for another token, replaces the one on screen and hides it again', async () => {
    const { result, auth0 } = setup();
    const first = fakeAccessToken({ exp: 1_900_000_000 });
    const second = fakeAccessToken({ exp: 1_900_003_600 });
    auth0.getAccessTokenSilently.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    act(() => {
      result.current.request();
    });
    await waitFor(() => {
      expect(result.current.token?.value).toBe(first);
    });
    act(() => {
      result.current.toggleReveal();
    });
    expect(result.current.revealed).toBe(true);

    act(() => {
      result.current.request();
    });
    await waitFor(() => {
      expect(result.current.token?.value).toBe(second);
    });

    expect(result.current.revealed).toBe(false);
    expect(auth0.getAccessTokenSilently).toHaveBeenCalledTimes(2);
    expect(auth0.getAccessTokenSilently).toHaveBeenNthCalledWith(2, { cacheMode: 'off' });
  });

  it('shows and hides the token on request, but only when there is one', async () => {
    const { result, auth0 } = setup();

    act(() => {
      result.current.toggleReveal();
    });
    expect(result.current.revealed).toBe(false);

    auth0.getAccessTokenSilently.mockResolvedValue(fakeAccessToken({ exp: FAKE_TOKEN_EXP }));
    act(() => {
      result.current.request();
    });
    await waitFor(() => {
      expect(result.current.token).not.toBeNull();
    });
    act(() => {
      result.current.toggleReveal();
    });
    expect(result.current.revealed).toBe(true);
    act(() => {
      result.current.toggleReveal();
    });
    expect(result.current.revealed).toBe(false);
  });

  it('makes a single request when asked twice before the answer arrives (FR-016)', async () => {
    const { result, auth0 } = setup();
    const answer = deferred<string>();
    auth0.getAccessTokenSilently.mockReturnValue(answer.promise);

    act(() => {
      result.current.request();
      result.current.request();
    });

    expect(auth0.getAccessTokenSilently).toHaveBeenCalledOnce();

    await act(async () => {
      answer.resolve(fakeAccessToken({ exp: FAKE_TOKEN_EXP }));
      await answer.promise;
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  describe('when the token cannot be obtained (FR-019)', () => {
    const failures = [
      {
        kind: 'session-expired',
        answer: () => Promise.reject(new GenericError('login_required', 'Login required')),
      },
      { kind: 'unknown', answer: () => Promise.reject(new Error('boom')) },
      { kind: 'unreadable-token', answer: () => Promise.resolve('no-es-un-jwt') },
    ] as const;

    it.each(failures)('reports $kind and keeps the token that was on screen', async (failure) => {
      vi.spyOn(logger, 'error').mockImplementation(() => undefined);
      const { result, auth0 } = setup();
      const token = fakeAccessToken({ exp: FAKE_TOKEN_EXP });
      auth0.getAccessTokenSilently
        .mockResolvedValueOnce(token)
        .mockImplementationOnce(failure.answer);
      act(() => {
        result.current.request();
      });
      await waitFor(() => {
        expect(result.current.token?.value).toBe(token);
      });

      act(() => {
        result.current.request();
      });
      await waitFor(() => {
        expect(result.current.failure).toBe(failure.kind);
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.token?.value).toBe(token);
    });

    it('clears the failure when the person tries again', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => undefined);
      const { result, auth0 } = setup();
      const answer = deferred<string>();
      auth0.getAccessTokenSilently
        .mockRejectedValueOnce(new Error('boom'))
        .mockReturnValueOnce(answer.promise);
      act(() => {
        result.current.request();
      });
      await waitFor(() => {
        expect(result.current.failure).toBe('unknown');
      });

      act(() => {
        result.current.request();
      });

      expect(result.current.failure).toBeNull();
      expect(result.current.isPending).toBe(true);
      await act(async () => {
        answer.resolve(fakeAccessToken({ exp: FAKE_TOKEN_EXP }));
        await answer.promise;
      });
      await waitFor(() => {
        expect(result.current.token).not.toBeNull();
      });
    });

    it('logs only the kind, never for a session that ended, and never the token or the message of the error', async () => {
      const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
      const { result, auth0 } = setup();
      auth0.getAccessTokenSilently
        .mockResolvedValueOnce('no-es-un-jwt')
        .mockRejectedValueOnce(new Error('boom secret detail'))
        .mockRejectedValueOnce(new GenericError('login_required', 'Login required'));

      for (const kind of ['unreadable-token', 'unknown', 'session-expired']) {
        act(() => {
          result.current.request();
        });
        await waitFor(() => {
          expect(result.current.failure).toBe(kind);
        });
      }

      expect(error).toHaveBeenCalledTimes(2);
      expect(error).toHaveBeenNthCalledWith(1, 'Could not obtain the access token', {
        kind: 'unreadable-token',
      });
      expect(error).toHaveBeenNthCalledWith(2, 'Could not obtain the access token', {
        kind: 'unknown',
      });
      expect(JSON.stringify(error.mock.calls)).not.toMatch(/no-es-un-jwt|boom|secret/);
    });
  });

  it('does not fail when the answer arrives after the screen is gone', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, auth0, unmount } = setup();
    const answer = deferred<string>();
    auth0.getAccessTokenSilently.mockReturnValue(answer.promise);
    act(() => {
      result.current.request();
    });

    unmount();
    await act(async () => {
      answer.resolve(fakeAccessToken({ exp: FAKE_TOKEN_EXP }));
      await answer.promise;
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('knows whether the token expired from the clock of the screen, set when it arrives (FR-013)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const { result, auth0 } = setup();
    auth0.getAccessTokenSilently
      .mockResolvedValueOnce(fakeAccessToken({ exp: nowInSeconds + 3600 }))
      .mockResolvedValueOnce(fakeAccessToken({ exp: nowInSeconds - 60 }));

    await act(async () => {
      result.current.request();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.token).not.toBeNull();
    expect(result.current.isExpired).toBe(false);

    await act(async () => {
      result.current.request();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.isExpired).toBe(true);
  });
});
