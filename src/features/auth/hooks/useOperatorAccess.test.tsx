import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { shouldRetryQuery } from '@/shared/api/retry';
import { auth0User } from '@/test/auth0Double';
import { roleDto, userDto } from '@/test/factories';
import { createUsersServiceMock, type MockAccount } from '@/test/handlers/usersService';
import { createWrapper } from '@/test/renderWithProviders';

import { ACCESS_CHECK_ATTEMPT_TIMEOUT_MS } from '../config/session';
import type { OperatorAccess } from '../policy/types';
import { useOperatorAccess, type OperatorAccessState } from './useOperatorAccess';

const SUB = 'auth0|user1';
const SIGNED_IN = { isAuthenticated: true, user: auth0User({ sub: SUB }) };

const marketing = roleDto({ id: 4, name: 'Marketing', permissions: ['tenants:read'] });
const owner = roleDto({ id: 5, name: 'Owner', permissions: ['clinics:read'] });

function accountWith(...roles: MockAccount['roles']): MockAccount {
  return { user: userDto({ auth0_id: SUB }), roles };
}

function grantedAccess(state: OperatorAccessState): OperatorAccess {
  if (state.status !== 'granted') {
    throw new Error(`Expected access to be granted, it is ${state.status}`);
  }
  return state.access;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useOperatorAccess', () => {
  describe('when the person may enter', () => {
    it('counts only the permissions of the authorized roles (US1-7)', async () => {
      createUsersServiceMock({ [SUB]: accountWith(marketing, owner) });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      expect(result.current.status).toBe('resolving');
      await waitFor(() => {
        expect(result.current.status).toBe('granted');
      });
      const access = grantedAccess(result.current);
      expect([...access.permissions]).toEqual(['tenants:read']);
      expect(access.authorizedRoles.map((role) => role.name)).toEqual(['Marketing']);
      expect(access.roles.map((role) => role.name)).toEqual(['Marketing', 'Owner']);
      expect(access.user).toMatchObject({ auth0Id: SUB, firstName: 'Ana' });
    });

    it('asks the users service once, with the bearer token (SC-001)', async () => {
      const usersService = createUsersServiceMock({ [SUB]: accountWith(marketing) });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });
      await waitFor(() => {
        expect(result.current.status).toBe('granted');
      });

      expect(usersService.requestCount).toBe(1);
      expect(usersService.requests[0]?.authorization).toBe(`Bearer test-token:${SUB}`);
    });

    it('grants access with an empty set of permissions when the role has none (US1-6)', async () => {
      createUsersServiceMock({
        [SUB]: accountWith(roleDto({ id: 3, name: 'Developer', permissions: [] })),
      });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.status).toBe('granted');
      });
      expect(grantedAccess(result.current).permissions.size).toBe(0);
    });
  });

  describe('when the person may not enter', () => {
    it('denies a person who is not registered', async () => {
      createUsersServiceMock({});
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current).toMatchObject({ status: 'denied', reason: 'not_registered' });
      });
    });

    it.each([
      [2, 'Bloqueado'],
      [3, 'Eliminado'],
    ])('denies an account with status %i', async (id, name) => {
      createUsersServiceMock({
        [SUB]: {
          user: userDto({ auth0_id: SUB, status: { id, name } }),
          roles: [roleDto({ name: 'Administrator', permissions: ['users:read'] })],
        },
      });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current).toMatchObject({ status: 'denied', reason: 'inactive_account' });
      });
    });

    it('denies a person whose only role does not give access', async () => {
      createUsersServiceMock({ [SUB]: accountWith(owner) });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current).toMatchObject({ status: 'denied', reason: 'no_authorized_role' });
      });
    });
  });

  describe('when the check cannot be completed', () => {
    it('fails after two retries when the service keeps failing, and recovers on request', async () => {
      const usersService = createUsersServiceMock({ [SUB]: accountWith(marketing) });
      usersService.failWith(500);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: shouldRetryQuery, retryDelay: 0 } },
      });
      const { wrapper } = createWrapper({ auth0: SIGNED_IN, queryClient });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });
      expect(usersService.requestCount).toBe(3);

      usersService.recover();
      act(() => {
        if (result.current.status === 'failed') {
          result.current.refetch();
        }
      });

      await waitFor(() => {
        expect(result.current.status).toBe('granted');
      });
    });

    it('fails with the 27 s budget when the service never answers, never after 30 s (SC-011)', async () => {
      const usersService = createUsersServiceMock({ [SUB]: accountWith(marketing) });
      usersService.hang();
      vi.useFakeTimers();
      const { wrapper } = createWrapper({ auth0: SIGNED_IN, queryClient: createQueryClient() });

      const startedAt = Date.now();
      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      // 3 attempts of 8 s plus the waits of 1 s and 2 s between them.
      const budget = 3 * ACCESS_CHECK_ATTEMPT_TIMEOUT_MS + 1_000 + 2_000;
      expect(budget).toBe(27_000);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(budget - 1);
      });
      expect(result.current.status).toBe('resolving');
      expect(usersService.requestCount).toBe(3);

      // The failure travels back through fetch and the retry logic on real ticks, so `vi.waitFor`
      // (which moves the fake clock along while it polls) is used instead of one more advance.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
        await vi.waitFor(() => {
          expect(result.current.status).toBe('failed');
        });
      });
      expect(Date.now() - startedAt).toBeLessThan(30_000);
    });

    it('cancels the request in flight when the query is cancelled', async () => {
      const usersService = createUsersServiceMock({ [SUB]: accountWith(marketing) });
      const release = usersService.defer();
      const { wrapper, queryClient } = createWrapper({ auth0: SIGNED_IN });
      renderHook(() => useOperatorAccess(), { wrapper });
      await waitFor(() => {
        expect(usersService.requestCount).toBe(1);
      });

      await act(async () => {
        await queryClient.cancelQueries();
      });

      await waitFor(() => {
        expect(usersService.abortedCount).toBe(1);
      });
      release();
    });

    it.each([
      ['without a subject', auth0User({ sub: undefined })],
      ['with an empty subject', auth0User({ sub: '' })],
    ])('fails without asking anything when the token claims are %s', (_label, user) => {
      const usersService = createUsersServiceMock({});
      const { wrapper } = createWrapper({ auth0: { isAuthenticated: true, user } });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      expect(result.current.status).toBe('failed');
      expect(usersService.requestCount).toBe(0);
    });
  });

  describe('the e-mail of the Auth0 account', () => {
    it('is the one in the token', async () => {
      createUsersServiceMock({});
      const { wrapper } = createWrapper({
        auth0: {
          isAuthenticated: true,
          user: auth0User({ sub: SUB, email: 'cuenta@ejemplo.com' }),
        },
      });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      expect(result.current.accountEmail).toBe('cuenta@ejemplo.com');
      await waitFor(() => {
        expect(result.current.status).toBe('denied');
      });
      expect(result.current.accountEmail).toBe('cuenta@ejemplo.com');
    });

    it('is null when the token does not carry it', () => {
      createUsersServiceMock({});
      const { wrapper } = createWrapper({
        auth0: { isAuthenticated: true, user: auth0User({ sub: SUB, email: undefined }) },
      });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      expect(result.current.accountEmail).toBeNull();
    });
  });

  describe('without a session', () => {
    it('does not ask anything', () => {
      const usersService = createUsersServiceMock({ [SUB]: accountWith(marketing) });
      const { wrapper } = createWrapper({ auth0: { isAuthenticated: false } });

      const { result } = renderHook(() => useOperatorAccess(), { wrapper });

      expect(result.current.status).toBe('resolving');
      expect(result.current.accountEmail).toBeNull();
      expect(usersService.requestCount).toBe(0);
    });
  });
});
