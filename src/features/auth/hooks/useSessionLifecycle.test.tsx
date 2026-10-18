import { act, renderHook } from '@testing-library/react';
import { createMocks, useIdleTimer } from 'react-idle-timer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionChannel, type SessionMessage } from '@/shared/lib/sessionChannel';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { createWrapper } from '@/test/renderWithProviders';

import { IDLE_PROMPT_BEFORE_MS, IDLE_TIMEOUT_MS } from '../config/session';
import { useOperatorAccess } from './useOperatorAccess';
import { useSessionLifecycle } from './useSessionLifecycle';

// The real timer runs; this only lets the tests see what it was configured with.
vi.mock('react-idle-timer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-idle-timer')>();
  return { ...actual, useIdleTimer: vi.fn(actual.useIdleTimer) };
});

const SIGNED_IN = { isAuthenticated: true, user: auth0User() };
const MINUTE = 60_000;
const PROMPT_AT = IDLE_TIMEOUT_MS - IDLE_PROMPT_BEFORE_MS;

/** The idle timer keeps the timers it found when it was loaded: point it at the fake ones. */
function useFakeClock(): void {
  vi.useFakeTimers();
  createMocks();
}

function setup(options: Parameters<typeof createWrapper>[0] = { auth0: SIGNED_IN }) {
  const harness = createWrapper({ route: '/profile', ...options });
  const hook = renderHook(() => useSessionLifecycle(), { wrapper: harness.wrapper });
  return { ...harness, ...hook };
}

async function pass(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function fire(type: string): void {
  act(() => {
    document.dispatchEvent(new Event(type, { bubbles: true }));
  });
}

beforeEach(() => {
  useFakeClock();
});

afterEach(() => {
  vi.useRealTimers();
  createMocks();
});

describe('useSessionLifecycle', () => {
  it('opens the warning at 14 minutes without activity and not before (US4-3)', async () => {
    const { result } = setup();

    await pass(PROMPT_AT - 1);
    expect(result.current.isPrompted).toBe(false);

    await pass(1);
    expect(result.current.isPrompted).toBe(true);
  });

  it('starts counting again when the person chooses to continue (US4-4)', async () => {
    const { result, auth0 } = setup();
    await pass(PROMPT_AT);
    expect(result.current.isPrompted).toBe(true);

    act(() => {
      result.current.continueSession();
    });
    expect(result.current.isPrompted).toBe(false);

    await pass(PROMPT_AT - 1);
    expect(result.current.isPrompted).toBe(false);
    await pass(1);
    expect(result.current.isPrompted).toBe(true);
    expect(auth0.logout).not.toHaveBeenCalled();
  });

  it('logs out for inactivity at 15 minutes, when the warning went unanswered (US4-5, SC-008)', async () => {
    const { result, auth0 } = setup();

    await pass(IDLE_TIMEOUT_MS - 1);
    expect(auth0.logout).not.toHaveBeenCalled();
    expect(result.current.isPrompted).toBe(true);

    await pass(1);
    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access/idle` },
    });
    expect(result.current.isPrompted).toBe(false);
  });

  it('exposes how long is left before the session closes', async () => {
    const { result } = setup();
    await pass(PROMPT_AT);

    expect(result.current.getRemainingTimeMs()).toBe(IDLE_PROMPT_BEFORE_MS);
    await pass(10_000);
    expect(result.current.getRemainingTimeMs()).toBe(IDLE_PROMPT_BEFORE_MS - 10_000);
  });

  describe('what counts as activity', () => {
    it.each(['mousedown', 'keydown', 'touchstart'])('%s postpones the warning', async (type) => {
      const { result } = setup();
      await pass(10 * MINUTE);

      fire(type);

      await pass(PROMPT_AT - 10 * MINUTE);
      expect(result.current.isPrompted).toBe(false);
      await pass(10 * MINUTE);
      expect(result.current.isPrompted).toBe(true);
    });

    it.each(['mousemove', 'wheel'])('%s does not', async (type) => {
      const { result } = setup();
      await pass(10 * MINUTE);

      fire(type);

      await pass(PROMPT_AT - 10 * MINUTE);
      expect(result.current.isPrompted).toBe(true);
    });

    it('a change of route postpones the warning', async () => {
      const { result, router } = setup();
      await pass(10 * MINUTE);

      await act(async () => {
        await router.navigate('/somewhere-else');
      });

      await pass(PROMPT_AT - 10 * MINUTE);
      expect(result.current.isPrompted).toBe(false);
      await pass(10 * MINUTE);
      expect(result.current.isPrompted).toBe(true);
    });

    it('the automatic re-checks of the access do not', async () => {
      const sub = 'auth0|user1';
      const usersService = createUsersServiceMock({
        [sub]: {
          user: userDto({ auth0_id: sub }),
          roles: [roleDto({ name: 'Marketing', permissions: ['tenants:read'] })],
        },
      });
      const harness = createWrapper({ route: '/profile', auth0: SIGNED_IN });
      const { result } = renderHook(
        () => ({ lifecycle: useSessionLifecycle(), access: useOperatorAccess() }),
        { wrapper: harness.wrapper },
      );

      await pass(PROMPT_AT);

      expect(usersService.requestCount).toBeGreaterThanOrEqual(3);
      expect(result.current.lifecycle.isPrompted).toBe(true);
    });
  });

  describe('with several tabs', () => {
    const toClose: { close: () => void }[] = [];

    /** Another tab of the browser, on the same channel. */
    function otherTab() {
      const channel = createSessionChannel();
      toClose.push(channel);
      return channel;
    }

    afterEach(() => {
      for (const channel of toClose.splice(0)) {
        channel.close();
      }
    });

    it('the activity of another tab postpones the warning', async () => {
      const { result } = setup();
      const other = otherTab();
      await pass(10 * MINUTE);

      other.post({ type: 'activity' });

      await pass(PROMPT_AT - 10 * MINUTE);
      expect(result.current.isPrompted).toBe(false);
      await pass(10 * MINUTE);
      expect(result.current.isPrompted).toBe(true);
    });

    it('the activity of this tab is told to the other tabs', async () => {
      setup();
      const heard: SessionMessage[] = [];
      otherTab().subscribe((message) => {
        heard.push(message);
      });

      fire('mousedown');

      await vi.waitFor(() => {
        expect(heard).toEqual([{ type: 'activity' }]);
      });
    });

    it('choosing to continue is told to the other tabs too', async () => {
      const { result } = setup();
      const heard: SessionMessage[] = [];
      otherTab().subscribe((message) => {
        heard.push(message);
      });
      await pass(PROMPT_AT);

      act(() => {
        result.current.continueSession();
      });

      await vi.waitFor(() => {
        expect(heard).toContainEqual({ type: 'activity' });
      });
    });

    it('a tab that says nothing, such as one the browser discarded, does not keep the session open', async () => {
      const { result, auth0 } = setup();
      otherTab().subscribe(() => undefined);

      await pass(IDLE_TIMEOUT_MS);

      expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
        logoutParams: { returnTo: `${window.location.origin}/access/idle` },
      });
      expect(result.current.isPrompted).toBe(false);
    });
  });

  it('does nothing without a session', async () => {
    const { result, auth0 } = setup({ auth0: { isAuthenticated: false } });

    await pass(IDLE_TIMEOUT_MS + MINUTE);

    expect(result.current.isPrompted).toBe(false);
    expect(auth0.logout).not.toHaveBeenCalled();
  });

  it('configures the idle timer as the specification asks', () => {
    setup();

    const options = vi.mocked(useIdleTimer).mock.calls[0]?.[0];
    expect(options).toMatchObject({
      timeout: IDLE_TIMEOUT_MS,
      promptBeforeIdle: IDLE_PROMPT_BEFORE_MS,
      stopOnIdle: true,
      events: ['mousedown', 'keydown', 'touchstart'],
      disabled: false,
    });
    expect(options?.throttle).toBeGreaterThan(0);
    // The library's own cross-tab mode waits for every tab it ever saw, even one that is gone.
    expect(options?.crossTab).toBeUndefined();
  });
});
