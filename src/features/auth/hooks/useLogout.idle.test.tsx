import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createSessionChannel, type SessionMessage } from '@/shared/lib/sessionChannel';
import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { consumeReturnPath } from '../session/returnPathStorage';
import { useLogout } from './useLogout';

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

describe('useLogout for inactivity', () => {
  it('remembers where the person was, without free text, and comes back to the inactivity notice (research D11)', async () => {
    const { wrapper, auth0 } = createWrapper({
      route: '/users?page=2&sort=name&q=maria%20lopez',
      auth0: SIGNED_IN,
    });
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      await result.current('idle');
    });

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access/idle` },
    });
    expect(consumeReturnPath()).toBe('/users?page=2&sort=name');
  });

  it('tells the other tabs that the reason was inactivity', async () => {
    const { wrapper } = createWrapper({ route: '/profile', auth0: SIGNED_IN });
    const otherTab = createSessionChannel();
    const received: SessionMessage[] = [];
    otherTab.subscribe((message) => {
      received.push(message);
    });
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      await result.current('idle');
    });

    await vi.waitFor(() => {
      expect(received).toEqual([{ type: 'session-ended', reason: 'idle' }]);
    });
    otherTab.close();
  });

  it('remembers nothing when the person logs out on purpose', async () => {
    const { wrapper, auth0 } = createWrapper({ route: '/profile?page=2', auth0: SIGNED_IN });
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
    expect(consumeReturnPath()).toBe('/');
  });
});
