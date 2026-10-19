import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { useSessionNotice } from './sessionContext';
import { useSessionExpiry } from './useSessionExpiry';

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

function setup() {
  const harness = createWrapper({ route: '/profile', auth0: SIGNED_IN });
  harness.queryClient.setQueryData(['anything'], 'cached data');
  const hook = renderHook(() => ({ expire: useSessionExpiry(), notice: useSessionNotice() }), {
    wrapper: harness.wrapper,
  });
  return { ...harness, ...hook };
}

describe('useSessionExpiry', () => {
  it('records that the session expired, discards the local session and empties the cache (FR-013)', async () => {
    const { result, auth0, queryClient } = setup();
    expect(result.current.notice).toBeUndefined();

    await act(async () => {
      await result.current.expire();
    });

    expect(result.current.notice).toBe('expired');
    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    expect(queryClient.getQueryData(['anything'])).toBeUndefined();
  });

  it('does not navigate: the route guard is the only one that redirects', async () => {
    const { result, router } = setup();

    await act(async () => {
      await result.current.expire();
    });

    expect(router.state.location.pathname).toBe('/profile');
    expect(router.state.location.state).toBeNull();
  });

  it('runs once however many requests report the expiry at the same time', async () => {
    const { result, auth0 } = setup();

    await act(async () => {
      await Promise.all([
        result.current.expire(),
        result.current.expire(),
        result.current.expire(),
      ]);
    });

    expect(auth0.logout).toHaveBeenCalledOnce();
  });

  it('records the notice before it discards the session, so the screen it lands on can say it', async () => {
    const { result, auth0 } = setup();
    const noticeWhenLoggingOut = vi.fn<(notice: unknown) => void>();
    auth0.logout.mockImplementation(() => {
      noticeWhenLoggingOut(result.current.notice);
      return Promise.resolve();
    });

    await act(async () => {
      await result.current.expire();
    });

    expect(noticeWhenLoggingOut).toHaveBeenCalledOnce();
    expect(result.current.notice).toBe('expired');
  });

  it('is armed again once the person has signed in again', async () => {
    const { result, auth0, updateAuth0 } = setup();
    await act(async () => {
      await result.current.expire();
    });
    updateAuth0({ isAuthenticated: false, user: undefined });
    updateAuth0({ isAuthenticated: true, user: auth0User() });

    await act(async () => {
      await result.current.expire();
    });

    expect(auth0.logout).toHaveBeenCalledTimes(2);
  });

  it('survives a logout that fails', async () => {
    const { result, auth0 } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    auth0.logout.mockRejectedValue(new Error('Auth0 is unreachable'));

    await act(async () => {
      await expect(result.current.expire()).resolves.toBeUndefined();
    });

    expect(result.current.notice).toBe('expired');
  });
});
