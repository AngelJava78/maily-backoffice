import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, SessionExpiredError } from '@/shared/api/ApiError';
import { createHttpClient } from '@/shared/api/httpClient';
import { server } from '@/test/server';

import { getMyAccess } from './authorizationApi';

const BASE_URL = 'http://localhost:5173/proxy/users';
const ME_URL = `${BASE_URL}/api/v1/authorization/me`;

const userDto = {
  id: 121,
  auth0_id: 'auth0|abc123',
  email: 'ana@clinica.com',
  first_name: 'Ana',
  paternal_last_name: 'Pérez',
  maternal_last_name: 'Gómez',
  status: { id: 1, name: 'Activo' },
  created_at: '2026-10-15T14:20:11.032Z',
  updated_at: '2026-10-15T14:20:11.032Z',
};

function createClient() {
  const onSessionExpired = vi.fn<() => void>();
  const client = createHttpClient({
    baseUrl: BASE_URL,
    getAccessToken: () => Promise.resolve('test-token:auth0|abc123'),
    onSessionExpired,
  });
  return { client, onSessionExpired };
}

function errorBody(code: string) {
  return { code, message: `Mensaje de ${code}` };
}

describe('getMyAccess', () => {
  it('asks for the access of the token owner with a single parameterless GET', async () => {
    const requests: { method: string; search: string; authorization: string | null }[] = [];
    server.use(
      http.get(ME_URL, ({ request }) => {
        requests.push({
          method: request.method,
          search: new URL(request.url).search,
          authorization: request.headers.get('authorization'),
        });
        return HttpResponse.json({
          user: userDto,
          roles: [{ id: 4, name: 'Marketing', permissions: ['tenants:read'] }],
        });
      }),
    );
    const { client } = createClient();

    const access = await getMyAccess(client, {});

    expect(requests).toEqual([
      { method: 'GET', search: '', authorization: 'Bearer test-token:auth0|abc123' },
    ]);
    expect(access.user).toMatchObject({ id: 121, firstName: 'Ana', paternalLastName: 'Pérez' });
    expect(access.roles).toEqual([{ id: 4, name: 'Marketing', permissions: ['tenants:read'] }]);
  });

  it('accepts the answer for a person that is not registered', async () => {
    server.use(http.get(ME_URL, () => HttpResponse.json({ user: null, roles: [] })));
    const { client } = createClient();

    await expect(getMyAccess(client, {})).resolves.toEqual({ user: null, roles: [] });
  });

  it.each(['unauthenticated', 'token_expired', 'invalid_token'])(
    'ends the session on a 401 %s and keeps the service error as the cause',
    async (code) => {
      server.use(http.get(ME_URL, () => HttpResponse.json(errorBody(code), { status: 401 })));
      const { client, onSessionExpired } = createClient();

      const failure: unknown = await getMyAccess(client, {}).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(SessionExpiredError);
      expect(failure).toHaveProperty('cause.code', code);
      expect(onSessionExpired).toHaveBeenCalledOnce();
    },
  );

  it.each([
    [503, 'authentication_unavailable'],
    [500, 'internal_error'],
  ])('reports a %i %s as a retryable ApiError', async (status, code) => {
    server.use(http.get(ME_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createClient();

    const failure: unknown = await getMyAccess(client, {}).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code, isRetryable: true });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    server.use(http.get(ME_URL, () => HttpResponse.json({ user: userDto })));
    const { client } = createClient();

    const failure: unknown = await getMyAccess(client, {}).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.get(ME_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createClient();
    const controller = new AbortController();
    const outcome = getMyAccess(client, { signal: controller.signal });
    const assertion = expect(outcome).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
