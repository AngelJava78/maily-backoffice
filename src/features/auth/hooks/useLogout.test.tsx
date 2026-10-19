import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionChannel, type SessionMessage } from '@/shared/lib/sessionChannel';
import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { useLogout } from './useLogout';

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

/** Another tab of the same browser, listening to the session channel. */
function listenFromAnotherTab() {
  const channel = createSessionChannel();
  const received: SessionMessage[] = [];
  channel.subscribe((message) => {
    received.push(message);
  });
  return { channel, received };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLogout', () => {
  it('tells the other tabs, empties the cache and ends the Auth0 session, in that order (US3-1, US3-3)', async () => {
    const { wrapper, queryClient, auth0 } = createWrapper({ auth0: SIGNED_IN });
    queryClient.setQueryData(['anything'], 'cached data');
    const post = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
    const clear = vi.spyOn(queryClient, 'clear');
    const otherTab = listenFromAnotherTab();
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(queryClient.getQueryData(['anything'])).toBeUndefined();
    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
    const order = [
      post.mock.invocationCallOrder[0],
      clear.mock.invocationCallOrder[0],
      auth0.logout.mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => (a ?? 0) - (b ?? 0)));
    await vi.waitFor(() => {
      expect(otherTab.received).toEqual([{ type: 'session-ended', reason: 'logout' }]);
    });
    otherTab.channel.close();
  });
});
