import { Auth0Context } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { auth0User, createAuth0Double } from '@/test/auth0Double';
import { operatorAccess } from '@/test/factories';
import { createWrapper } from '@/test/renderWithProviders';

import type { AccessDecision } from '../policy/types';
import { accessKeys } from './accessKeys';
import { useGrantedAccess } from './useGrantedAccess';

/** Providers without a router, so that an error thrown by the hook reaches the test. */
function bareWrapper(queryClient: QueryClient) {
  const auth0 = createAuth0Double({
    isAuthenticated: true,
    user: auth0User({ sub: 'auth0|user1' }),
  });
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <Auth0Context.Provider value={auth0}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Auth0Context.Provider>
    );
  };
}

const key = accessKeys.operator('auth0|user1');

describe('useGrantedAccess', () => {
  it('gives the access that the guard keeps in the cache', () => {
    const { wrapper } = createWrapper({
      access: operatorAccess({ permissions: new Set(['tenants:read']) }),
    });

    const { result } = renderHook(() => useGrantedAccess(), { wrapper });

    expect([...result.current.permissions]).toEqual(['tenants:read']);
    expect(result.current.user.firstName).toBe('Ana');
  });

  it('follows the cache when the access changes, for example after a re-check', async () => {
    const harness = createWrapper({
      access: operatorAccess({ permissions: new Set(['tenants:read']) }),
    });
    const { result } = renderHook(() => useGrantedAccess(), { wrapper: harness.wrapper });

    await harness.updateAccess(operatorAccess({ permissions: new Set(['users:read']) }));

    expect([...result.current.permissions]).toEqual(['users:read']);
  });

  it('keeps the last access while the cache is being emptied, until the guard removes the screens', () => {
    const harness = createWrapper({ access: operatorAccess() });
    const { result } = renderHook(() => useGrantedAccess(), { wrapper: harness.wrapper });
    const before = result.current;

    act(() => {
      harness.queryClient.clear();
    });

    expect(result.current.user.firstName).toBe(before.user.firstName);
  });

  it('never asks the users service itself: the guard is the one that does', () => {
    const queryClient = new QueryClient();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const granted: AccessDecision = { kind: 'granted', access: operatorAccess() };
    queryClient.setQueryData(key, granted);

    renderHook(() => useGrantedAccess(), { wrapper: bareWrapper(queryClient) });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails with a clear error where the access has not been granted', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      renderHook(() => useGrantedAccess(), { wrapper: bareWrapper(new QueryClient()) }),
    ).toThrow(/access has been granted/);
  });

  it('fails where the access was denied', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const queryClient = new QueryClient();
    const denied: AccessDecision = { kind: 'denied', reason: 'no_authorized_role' };
    queryClient.setQueryData(key, denied);

    expect(() =>
      renderHook(() => useGrantedAccess(), { wrapper: bareWrapper(queryClient) }),
    ).toThrow(/access has been granted/);
  });
});
