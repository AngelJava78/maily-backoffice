import { Auth0Context, GenericError } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { SessionProvider } from '@/features/auth';
import { useSessionNotice } from '@/features/auth/hooks/sessionContext';
import { SessionExpiredError } from '@/shared/api/ApiError';
import { useHttpClients } from '@/shared/api/httpClientsContext';
import { createAuth0Double } from '@/test/auth0Double';
import { SUBSCRIPTIONS_API_BASE_URL } from '@/test/handlers/subscriptionsCatalog/baseUrl';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { server } from '@/test/server';

import type { AppEnv } from '../config/env';
import { HttpClientsProvider } from './HttpClientsProvider';

const env: AppEnv = {
  VITE_AUTH0_DOMAIN: 'tenant.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: USERS_API_BASE_URL,
  VITE_CLINICS_API_URL: undefined,
  VITE_SUBSCRIPTIONS_API_URL: '/proxy/subscriptions',
  VITE_DASHBOARD_REFRESH_MINUTES: 5,
  VITE_MAILYSOFT_APP_URL: undefined,
};

const pingSchema = z.object({ ok: z.boolean() });

function setup() {
  const auth0 = createAuth0Double({ isAuthenticated: true });
  const queryClient = new QueryClient();
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <Auth0Context.Provider value={auth0}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <HttpClientsProvider env={env}>{children}</HttpClientsProvider>
          </SessionProvider>
        </QueryClientProvider>
      </Auth0Context.Provider>
    );
  }
  const { result } = renderHook(() => ({ clients: useHttpClients(), notice: useSessionNotice() }), {
    wrapper: Wrapper,
  });
  const { users, subscriptions } = result.current.clients;
  return { users, subscriptions, result, mocks: auth0.mocks };
}

describe('HttpClientsProvider', () => {
  it('sends the access token of the Auth0 session to the users service', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${USERS_API_BASE_URL}/api/v1/ping`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    const { users, mocks } = setup();
    mocks.getAccessTokenSilently.mockResolvedValue('the-access-token');

    await expect(users.get('/api/v1/ping', { schema: pingSchema })).resolves.toEqual({ ok: true });

    expect(authorization).toBe('Bearer the-access-token');
  });

  it('sends each request to the base of its own API, with the same access token (FR-022)', async () => {
    const received: { readonly api: string; readonly authorization: string | null }[] = [];
    server.use(
      http.get(`${USERS_API_BASE_URL}/api/v1/ping`, ({ request }) => {
        received.push({ api: 'users', authorization: request.headers.get('authorization') });
        return HttpResponse.json({ ok: true });
      }),
      http.get(`${SUBSCRIPTIONS_API_BASE_URL}/api/v1/ping`, ({ request }) => {
        received.push({
          api: 'subscriptions',
          authorization: request.headers.get('authorization'),
        });
        return HttpResponse.json({ ok: false });
      }),
    );
    const { users, subscriptions, mocks } = setup();
    mocks.getAccessTokenSilently.mockResolvedValue('the-access-token');

    await expect(subscriptions.get('/api/v1/ping', { schema: pingSchema })).resolves.toEqual({
      ok: false,
    });
    await expect(users.get('/api/v1/ping', { schema: pingSchema })).resolves.toEqual({ ok: true });

    expect(received).toEqual([
      { api: 'subscriptions', authorization: 'Bearer the-access-token' },
      { api: 'users', authorization: 'Bearer the-access-token' },
    ]);
  });

  it('closes the session from the subscriptions API too when Auth0 can no longer renew it', async () => {
    const { subscriptions, mocks, result } = setup();
    mocks.getAccessTokenSilently.mockRejectedValue(
      new GenericError('login_required', 'Login required'),
    );

    await expect(subscriptions.get('/api/v1/ping', { schema: pingSchema })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    await vi.waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    });
    expect(result.current.notice).toBe('expired');
  });

  it('asks Auth0 for a fresh token, skipping its cache, after the service refuses one', async () => {
    let requests = 0;
    server.use(
      http.get(`${USERS_API_BASE_URL}/api/v1/ping`, () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json({ code: 'token_expired', message: 'Vencido' }, { status: 401 })
          : HttpResponse.json({ ok: true });
      }),
    );
    const { users, mocks } = setup();
    mocks.getAccessTokenSilently.mockResolvedValue('a-token');

    await expect(users.get('/api/v1/ping', { schema: pingSchema })).resolves.toEqual({ ok: true });

    expect(mocks.getAccessTokenSilently).toHaveBeenCalledTimes(2);
    expect(mocks.getAccessTokenSilently).toHaveBeenLastCalledWith({ cacheMode: 'off' });
  });

  it('treats an Auth0 SDK that gives no token as an expired session', async () => {
    const { users, mocks } = setup();
    mocks.getAccessTokenSilently.mockResolvedValue(undefined);

    await expect(users.get('/api/v1/ping', { schema: pingSchema })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('closes the session when Auth0 can no longer renew it, and records that it expired (FR-013)', async () => {
    const { users, mocks, result } = setup();
    mocks.getAccessTokenSilently.mockRejectedValue(
      new GenericError('login_required', 'Login required'),
    );

    await expect(users.get('/api/v1/ping', { schema: pingSchema })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    await vi.waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledExactlyOnceWith({ openUrl: false });
    });
    expect(result.current.notice).toBe('expired');
  });

  it('lets an unrelated Auth0 failure through without closing the session', async () => {
    const { users, mocks, result } = setup();
    const failure = new Error('Auth0 is unreachable');
    mocks.getAccessTokenSilently.mockRejectedValue(failure);

    await expect(users.get('/api/v1/ping', { schema: pingSchema })).rejects.toBe(failure);

    expect(mocks.logout).not.toHaveBeenCalled();
    expect(result.current.notice).toBeUndefined();
  });
});
