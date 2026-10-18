import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock } from '@/test/handlers/usersService';
import { createWrapper } from '@/test/renderWithProviders';

import { ACCESS_RECHECK_INTERVAL_MS } from '../config/session';
import { useOperatorAccess, type OperatorAccessState } from './useOperatorAccess';

const SUB = 'auth0|user1';
const SIGNED_IN = { isAuthenticated: true, user: auth0User({ sub: SUB }) };
const marketing = roleDto({ name: 'Marketing', permissions: ['tenants:read'] });

/** The tab loses the focus and gets it back, which is what changing tabs does. */
function returnToTab(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

async function untilStatus(
  result: { readonly current: OperatorAccessState },
  status: OperatorAccessState['status'],
): Promise<void> {
  await act(async () => {
    await vi.waitFor(() => {
      expect(result.current.status).toBe(status);
    });
  });
}

async function setup() {
  const usersService = createUsersServiceMock({
    [SUB]: { user: userDto({ auth0_id: SUB }), roles: [marketing] },
  });
  vi.useFakeTimers();
  const { wrapper } = createWrapper({ auth0: SIGNED_IN });
  const startedAt = Date.now();
  const { result } = renderHook(() => useOperatorAccess(), { wrapper });
  await untilStatus(result, 'granted');
  // Waiting for the first answer moves the fake clock along; the schedule counts from the start.
  return { usersService, result, elapsedMs: Date.now() - startedAt };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useOperatorAccess re-checks', () => {
  it('repeats the check every five minutes while the session is open (FR-019)', async () => {
    const { usersService, elapsedMs } = await setup();
    expect(usersService.requestCount).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS - elapsedMs - 1);
    });
    expect(usersService.requestCount).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await vi.waitFor(() => {
        expect(usersService.requestCount).toBe(2);
      });
    });
  });

  it('repeats the check as soon as the tab gets the focus, even if the data is recent', async () => {
    const { usersService } = await setup();

    returnToTab();

    await act(async () => {
      await vi.waitFor(() => {
        expect(usersService.requestCount).toBe(2);
      });
    });
  });

  it('withdraws the access when the user gets blocked, and gives it back when unblocked (US2-7)', async () => {
    const { usersService, result } = await setup();

    usersService.setStatus(SUB, { id: 2, name: 'Bloqueado' });
    returnToTab();
    await untilStatus(result, 'denied');
    expect(result.current).toMatchObject({ status: 'denied', reason: 'inactive_account' });

    usersService.setStatus(SUB, { id: 1, name: 'Activo' });
    returnToTab();
    await untilStatus(result, 'granted');
  });

  it('updates the permissions when one is taken away (US2-8)', async () => {
    const { usersService, result } = await setup();
    expect(result.current.status === 'granted' && result.current.access.permissions.size).toBe(1);

    usersService.setRoles(SUB, [roleDto({ name: 'Marketing', permissions: [] })]);
    returnToTab();

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.status === 'granted' && result.current.access.permissions.size).toBe(
          0,
        );
      });
    });
    expect(result.current.status).toBe('granted');
  });

  it.each([500, 503])(
    'keeps the last granted state when a re-check fails with %i',
    async (status) => {
      const { usersService, result } = await setup();

      usersService.failWith(status);
      returnToTab();
      await act(async () => {
        await vi.waitFor(() => {
          expect(usersService.requestCount).toBe(2);
        });
      });

      expect(result.current.status).toBe('granted');
    },
  );

  it('keeps asking on schedule after a failed re-check', async () => {
    const { usersService, result } = await setup();
    usersService.failWith(500);
    returnToTab();
    await act(async () => {
      await vi.waitFor(() => {
        expect(usersService.requestCount).toBe(2);
      });
    });

    usersService.recover();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACCESS_RECHECK_INTERVAL_MS);
      await vi.waitFor(() => {
        expect(usersService.requestCount).toBe(3);
      });
    });

    expect(result.current.status).toBe('granted');
  });
});
