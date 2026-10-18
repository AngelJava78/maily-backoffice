import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionChannel } from '@/shared/lib/sessionChannel';
import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import { useSessionNotice } from './sessionContext';
import { useSessionEndedListener } from './useSessionEndedListener';

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };

const toClose: { close: () => void }[] = [];

/** Another tab of the same browser, which ends its session and tells the rest. */
function otherTab() {
  const channel = createSessionChannel();
  toClose.push(channel);
  return channel;
}

function setup() {
  const harness = createWrapper({ route: '/profile', auth0: SIGNED_IN });
  harness.queryClient.setQueryData(['anything'], 'cached data');
  const hook = renderHook(
    () => {
      useSessionEndedListener();
      return useSessionNotice();
    },
    { wrapper: harness.wrapper },
  );
  return { ...harness, ...hook };
}

/** `vi.waitFor` inside `act`, because Auth0 and the cache change state meanwhile. */
async function waitInAct(assertion: () => void): Promise<void> {
  await act(async () => {
    await vi.waitFor(assertion);
  });
}

afterEach(() => {
  for (const channel of toClose.splice(0)) {
    channel.close();
  }
});

describe('useSessionEndedListener', () => {
  it('discards the local session and empties the cache when another tab logs out (US3-4)', async () => {
    const { result, queryClient, auth0 } = setup();

    otherTab().post({ type: 'session-ended', reason: 'logout' });

    await waitInAct(() => {
      expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    });
    await waitInAct(() => {
      expect(queryClient.getQueryData(['anything'])).toBeUndefined();
    });
    expect(result.current).toBeUndefined();
  });

  it('leaves the redirection to the route guard', async () => {
    const { router, auth0 } = setup();

    otherTab().post({ type: 'session-ended', reason: 'logout' });
    await waitInAct(() => {
      expect(auth0.logout).toHaveBeenCalledOnce();
    });

    expect(router.state.location.pathname).toBe('/profile');
  });

  it('records the inactivity notice when the other tab was closed for inactivity (FR-020)', async () => {
    const { result, auth0 } = setup();

    otherTab().post({ type: 'session-ended', reason: 'idle' });

    await waitInAct(() => {
      expect(auth0.logout).toHaveBeenCalledOnce();
    });
    expect(result.current).toBe('idle');
  });

  it('does not react to the activity of other tabs', async () => {
    const { auth0 } = setup();

    otherTab().post({ type: 'activity' });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(auth0.logout).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts', async () => {
    const { auth0, unmount } = setup();

    unmount();
    otherTab().post({ type: 'session-ended', reason: 'logout' });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(auth0.logout).not.toHaveBeenCalled();
  });
});
