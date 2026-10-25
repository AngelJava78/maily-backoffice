import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { watchFetchCalls } from '@/test/fetchCalls';
import { server } from '@/test/server';

import { ApiError, SessionExpiredError } from './ApiError';
import {
  createAnonymousHttpClient,
  createHttpClient,
  type GetAccessToken,
  type HttpClient,
} from './httpClient';
import { runWithTimeout } from './timeout';

const BASE_URL = 'http://localhost:5173/proxy/users';
const THINGS_URL = `${BASE_URL}/api/v1/things`;

const thingSchema = z
  .object({ id: z.number(), display_name: z.string() })
  .transform((dto) => ({ id: dto.id, displayName: dto.display_name }));

const thingDto = { id: 1, display_name: 'First' };

function createClient(options: { baseUrl?: string; timeoutMs?: number } = {}) {
  const getAccessToken = vi.fn<GetAccessToken>().mockResolvedValue('token-1');
  const onSessionExpired = vi.fn<() => void>();
  const client: HttpClient = createHttpClient({
    baseUrl: options.baseUrl ?? BASE_URL,
    getAccessToken,
    onSessionExpired,
    timeoutMs: options.timeoutMs,
  });
  return { client, getAccessToken, onSessionExpired };
}

afterEach(() => {
  vi.useRealTimers();
});

/** The credentials mode of each call to `fetch` since `watchFetchCalls` (MSW cannot see it). */
function watchCredentials(): () => (RequestCredentials | undefined)[] {
  const calls = watchFetchCalls();
  return () => calls().map((call) => call.credentials);
}

describe('createHttpClient', () => {
  describe('successful requests', () => {
    it('returns the body validated and transformed by the schema', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json(thingDto)));
      const { client } = createClient();

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).resolves.toEqual({
        id: 1,
        displayName: 'First',
      });
    });

    it('sends the access token as a bearer token and asks for JSON', async () => {
      let headers: Headers | undefined;
      server.use(
        http.get(`${THINGS_URL}/1`, ({ request }) => {
          headers = request.headers;
          return HttpResponse.json(thingDto);
        }),
      );
      const { client, getAccessToken } = createClient();

      await client.get('/api/v1/things/1', { schema: thingSchema });

      expect(headers?.get('authorization')).toBe('Bearer token-1');
      expect(headers?.get('accept')).toBe('application/json');
      expect(getAccessToken.mock.calls[0]).toEqual([]);
    });

    it('resolves a relative base URL against the origin of the page', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json(thingDto)));
      const { client } = createClient({ baseUrl: '/proxy/users' });

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).resolves.toEqual({
        id: 1,
        displayName: 'First',
      });
    });

    it('ignores a trailing slash in the base URL', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json(thingDto)));
      const { client } = createClient({ baseUrl: `${BASE_URL}/` });

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).resolves.toEqual({
        id: 1,
        displayName: 'First',
      });
    });

    it('serializes the query parameters and skips the undefined ones', async () => {
      let url: URL | undefined;
      server.use(
        http.get(THINGS_URL, ({ request }) => {
          url = new URL(request.url);
          return HttpResponse.json([]);
        }),
      );
      const { client } = createClient();

      await client.get('/api/v1/things', {
        schema: z.array(z.unknown()),
        query: { page: 2, page_size: 10, search: undefined, active: true, sort: 'a b' },
      });

      expect(url?.search).toBe('?page=2&page_size=10&active=true&sort=a+b');
    });

    it('sends a JSON body with the method requested', async () => {
      let received: { method: string; contentType: string | null; body: unknown } | undefined;
      server.use(
        http.post(THINGS_URL, async ({ request }) => {
          received = {
            method: request.method,
            contentType: request.headers.get('content-type'),
            body: await request.json(),
          };
          return HttpResponse.json(thingDto, { status: 201 });
        }),
      );
      const { client } = createClient();

      const created = await client.request({
        method: 'POST',
        path: '/api/v1/things',
        body: { display_name: 'First' },
        schema: thingSchema,
      });

      expect(created).toEqual({ id: 1, displayName: 'First' });
      expect(received).toEqual({
        method: 'POST',
        contentType: 'application/json',
        body: { display_name: 'First' },
      });
    });

    it('accepts an empty 204 response when the schema allows undefined', async () => {
      server.use(http.delete(`${THINGS_URL}/1`, () => new HttpResponse(null, { status: 204 })));
      const { client } = createClient();

      await expect(
        client.request({ method: 'DELETE', path: '/api/v1/things/1', schema: z.undefined() }),
      ).resolves.toBeUndefined();
    });
  });

  describe('the access token', () => {
    it('is not sent to a host other than the configured one', async () => {
      let headers: Headers | undefined;
      server.use(
        http.get('https://other.example.com/data', ({ request }) => {
          headers = request.headers;
          return HttpResponse.json(thingDto);
        }),
      );
      const { client, getAccessToken } = createClient();

      await client.get('https://other.example.com/data', { schema: thingSchema });

      expect(headers?.get('authorization')).toBeNull();
      expect(getAccessToken).not.toHaveBeenCalled();
    });

    it('is not sent to the same host on another port or scheme', async () => {
      let headers: Headers | undefined;
      server.use(
        http.get('http://localhost:5174/data', ({ request }) => {
          headers = request.headers;
          return HttpResponse.json(thingDto);
        }),
      );
      const { client } = createClient();

      await client.get('http://localhost:5174/data', { schema: thingSchema });

      expect(headers?.get('authorization')).toBeNull();
    });

    it('is renewed once after a 401 and the request is repeated with the new one', async () => {
      const authorizations: (string | null)[] = [];
      server.use(
        http.get(`${THINGS_URL}/1`, ({ request }) => {
          authorizations.push(request.headers.get('authorization'));
          return authorizations.length === 1
            ? HttpResponse.json(
                { code: 'token_expired', message: 'Token vencido' },
                { status: 401 },
              )
            : HttpResponse.json(thingDto);
        }),
      );
      const { client, getAccessToken, onSessionExpired } = createClient();
      getAccessToken.mockResolvedValueOnce('stale-token').mockResolvedValueOnce('fresh-token');

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).resolves.toEqual({
        id: 1,
        displayName: 'First',
      });

      expect(authorizations).toEqual(['Bearer stale-token', 'Bearer fresh-token']);
      expect(getAccessToken).toHaveBeenCalledTimes(2);
      expect(getAccessToken).toHaveBeenNthCalledWith(2, { cacheMode: 'off' });
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('ends the session when the request is rejected again after renewing the token', async () => {
      let requests = 0;
      server.use(
        http.get(`${THINGS_URL}/1`, () => {
          requests += 1;
          return HttpResponse.json(
            { code: 'token_expired', message: 'Token vencido' },
            { status: 401 },
          );
        }),
      );
      const { client, onSessionExpired } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(SessionExpiredError);
      expect(failure).toHaveProperty('cause.code', 'token_expired');
      expect(requests).toBe(2);
      expect(onSessionExpired).toHaveBeenCalledOnce();
    });

    it('ends the session when the token cannot be obtained any more', async () => {
      const { client, getAccessToken, onSessionExpired } = createClient();
      getAccessToken.mockRejectedValue(new SessionExpiredError());

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).rejects.toBeInstanceOf(
        SessionExpiredError,
      );

      expect(onSessionExpired).toHaveBeenCalledOnce();
    });

    it('ends the session when the token cannot be renewed after a 401', async () => {
      server.use(
        http.get(`${THINGS_URL}/1`, () =>
          HttpResponse.json({ code: 'token_expired', message: 'Token vencido' }, { status: 401 }),
        ),
      );
      const { client, getAccessToken, onSessionExpired } = createClient();
      getAccessToken
        .mockResolvedValueOnce('stale-token')
        .mockRejectedValueOnce(new SessionExpiredError());

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).rejects.toBeInstanceOf(
        SessionExpiredError,
      );

      expect(onSessionExpired).toHaveBeenCalledOnce();
    });

    it('lets other failures to obtain the token through without ending the session', async () => {
      const { client, getAccessToken, onSessionExpired } = createClient();
      const failure = new Error('Auth0 is unreachable');
      getAccessToken.mockRejectedValue(failure);

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).rejects.toBe(failure);

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('does not renew the token for a 403', async () => {
      server.use(
        http.get(`${THINGS_URL}/1`, () =>
          HttpResponse.json({ code: 'forbidden', message: 'Sin permiso' }, { status: 403 }),
        ),
      );
      const { client, getAccessToken, onSessionExpired } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({ status: 403, code: 'forbidden' });
      expect(getAccessToken).toHaveBeenCalledOnce();
      expect(onSessionExpired).not.toHaveBeenCalled();
    });
  });

  describe('while the token is being obtained', () => {
    const neverGivesAToken = () => new Promise<string>(() => undefined);

    it('gives up when the time limit of the caller runs out, without sending anything', async () => {
      vi.useFakeTimers();
      let requests = 0;
      server.use(
        http.get(`${THINGS_URL}/1`, () => {
          requests += 1;
          return HttpResponse.json(thingDto);
        }),
      );
      const { client, getAccessToken } = createClient();
      getAccessToken.mockImplementation(neverGivesAToken);
      const outcome = runWithTimeout(undefined, 8_000, (signal) =>
        client.get('/api/v1/things/1', { schema: thingSchema, signal }),
      );
      const assertion = expect(outcome).rejects.toMatchObject({
        kind: 'timeout',
        isRetryable: true,
      });

      await vi.advanceTimersByTimeAsync(8_000);

      await assertion;
      expect(requests).toBe(0);
    });

    it('gives up after its own time limit when the caller sets none', async () => {
      vi.useFakeTimers();
      const { client, getAccessToken } = createClient();
      getAccessToken.mockImplementation(neverGivesAToken);
      const outcome = client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(30_000);

      expect(await outcome).toMatchObject({ kind: 'timeout' });
    });

    it('gives up when the renewal of the token after a 401 takes too long', async () => {
      vi.useFakeTimers();
      server.use(
        http.get(`${THINGS_URL}/1`, () =>
          HttpResponse.json({ code: 'token_expired', message: 'Vencido' }, { status: 401 }),
        ),
      );
      const { client, getAccessToken, onSessionExpired } = createClient();
      getAccessToken.mockResolvedValueOnce('stale-token').mockImplementationOnce(neverGivesAToken);
      const outcome = runWithTimeout(undefined, 8_000, (signal) =>
        client.get('/api/v1/things/1', { schema: thingSchema, signal }),
      );
      const assertion = expect(outcome).rejects.toMatchObject({ kind: 'timeout' });

      await vi.advanceTimersByTimeAsync(8_000);

      await assertion;
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('rejects with an AbortError when the caller cancels meanwhile', async () => {
      const { client, getAccessToken } = createClient();
      getAccessToken.mockImplementation(neverGivesAToken);
      const controller = new AbortController();
      const outcome = client.get('/api/v1/things/1', {
        schema: thingSchema,
        signal: controller.signal,
      });
      const assertion = expect(outcome).rejects.toMatchObject({ name: 'AbortError' });

      controller.abort();

      await assertion;
    });

    it('is not affected by a token that arrives in time', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json(thingDto)));
      const { client, getAccessToken } = createClient();
      getAccessToken.mockImplementation(
        () =>
          new Promise<string>((resolve) =>
            setTimeout(() => {
              resolve('late-token');
            }, 20),
          ),
      );

      await expect(client.get('/api/v1/things/1', { schema: thingSchema })).resolves.toEqual({
        id: 1,
        displayName: 'First',
      });
    });
  });

  describe('failures', () => {
    it('turns an error response into an ApiError with the code and message of the service', async () => {
      server.use(
        http.get(`${THINGS_URL}/9`, () =>
          HttpResponse.json(
            { code: 'user_not_found', message: 'No existe el usuario' },
            { status: 404 },
          ),
        ),
      );
      const { client } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/9', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({
        status: 404,
        code: 'user_not_found',
        message: 'No existe el usuario',
        kind: 'http',
        isRetryable: false,
      });
    });

    it('classifies a response that is not JSON as an unknown, retryable server error', async () => {
      server.use(
        http.get(`${THINGS_URL}/1`, () => new HttpResponse('Bad Gateway', { status: 502 })),
      );
      const { client } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({ status: 502, code: 'unknown_error', isRetryable: true });
    });

    it('reports a body that breaks the schema as a contract failure', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json({ id: 'one' })));
      const { client } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({
        kind: 'contract',
        code: 'contract_violation',
        status: 200,
        isRetryable: false,
      });
    });

    it('reports a successful response that is not JSON as a contract failure', async () => {
      server.use(
        http.get(`${THINGS_URL}/1`, () => new HttpResponse('<html></html>', { status: 200 })),
      );
      const { client } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({ kind: 'contract', status: 200 });
    });

    it('reports a network failure as a retryable ApiError', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.error()));
      const { client } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({ kind: 'network', status: null, isRetryable: true });
    });
  });

  describe('time limit and cancellation', () => {
    const neverAnswers = (): Promise<Response> => new Promise<Response>(() => undefined);

    it('gives up after 30 seconds by default', async () => {
      vi.useFakeTimers();
      server.use(http.get(`${THINGS_URL}/1`, neverAnswers));
      const { client } = createClient();
      const outcome = client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(29_999);
      let settled = false;
      void outcome.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toMatchObject({ kind: 'timeout', isRetryable: true });
    });

    it('honours a different time limit', async () => {
      vi.useFakeTimers();
      server.use(http.get(`${THINGS_URL}/1`, neverAnswers));
      const { client } = createClient({ timeoutMs: 5_000 });
      const outcome = client
        .get('/api/v1/things/1', { schema: thingSchema })
        .catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(5_000);

      expect(await outcome).toMatchObject({ kind: 'timeout' });
    });

    it('rejects with an AbortError when the caller cancels', async () => {
      server.use(http.get(`${THINGS_URL}/1`, neverAnswers));
      const { client } = createClient();
      const controller = new AbortController();
      const outcome = client.get('/api/v1/things/1', {
        schema: thingSchema,
        signal: controller.signal,
      });
      const assertion = expect(outcome).rejects.toMatchObject({ name: 'AbortError' });

      controller.abort();

      await assertion;
    });

    it('reports the abort of an outer time limit as a retryable timeout', async () => {
      vi.useFakeTimers();
      server.use(http.get(`${THINGS_URL}/1`, neverAnswers));
      const { client } = createClient();
      const outcome = runWithTimeout(undefined, 8_000, (signal) =>
        client.get('/api/v1/things/1', { schema: thingSchema, signal }),
      );
      const assertion = expect(outcome).rejects.toMatchObject({
        kind: 'timeout',
        isRetryable: true,
      });

      await vi.advanceTimersByTimeAsync(8_000);

      await assertion;
    });

    it('honours the time limit of a single request (feature 016, research D7)', async () => {
      vi.useFakeTimers();
      server.use(http.get(`${THINGS_URL}/1`, neverAnswers));
      const { client } = createClient();
      const outcome = client
        .get('/api/v1/things/1', { schema: thingSchema, timeoutMs: 15_000 })
        .catch((error: unknown) => error);
      let settled = false;
      void outcome.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(14_999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toMatchObject({ kind: 'timeout' });
    });
  });

  // The public routes of the platform (feature 016, research D3): the public status and the
  // direct check never ask for the token, never send it nor cookies, and never end the session.
  describe('anonymous requests', () => {
    it('neither asks for the token nor sends it, and sends no cookies', async () => {
      let authorization: string | null | undefined;
      server.use(
        http.get(`${THINGS_URL}/1`, ({ request }) => {
          authorization = request.headers.get('authorization');
          return HttpResponse.json(thingDto);
        }),
      );
      const credentials = watchCredentials();
      const { client, getAccessToken } = createClient();

      await expect(
        client.get('/api/v1/things/1', { schema: thingSchema, anonymous: true }),
      ).resolves.toEqual({ id: 1, displayName: 'First' });

      expect(authorization).toBeNull();
      expect(credentials()).toEqual(['omit']);
      expect(getAccessToken).not.toHaveBeenCalled();
    });

    it('works when the token of the session cannot be obtained', async () => {
      server.use(http.get(`${THINGS_URL}/1`, () => HttpResponse.json(thingDto)));
      const { client, getAccessToken, onSessionExpired } = createClient();
      getAccessToken.mockRejectedValue(new SessionExpiredError());

      await expect(
        client.get('/api/v1/things/1', { schema: thingSchema, anonymous: true }),
      ).resolves.toEqual({ id: 1, displayName: 'First' });

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('treats a 401 as one more error: no renewal and the session goes on', async () => {
      let requests = 0;
      server.use(
        http.get(`${THINGS_URL}/1`, () => {
          requests += 1;
          return HttpResponse.json(
            { code: 'unauthenticated', message: 'Sin sesión' },
            { status: 401 },
          );
        }),
      );
      const { client, getAccessToken, onSessionExpired } = createClient();

      const failure: unknown = await client
        .get('/api/v1/things/1', { schema: thingSchema, anonymous: true })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({ status: 401, code: 'unauthenticated' });
      expect(requests).toBe(1);
      expect(getAccessToken).not.toHaveBeenCalled();
      expect(onSessionExpired).not.toHaveBeenCalled();
    });
  });

  describe('probe', () => {
    const LIVE_URL = `${BASE_URL}/health/live`;

    it('answers with the status and the JSON body', async () => {
      server.use(http.get(LIVE_URL, () => HttpResponse.json({ status: 'ok' })));
      const { client } = createClient({ baseUrl: '/proxy/users' });

      await expect(client.probe('/health/live')).resolves.toEqual({
        status: 200,
        body: { status: 'ok' },
      });
    });

    it('answers a 503 with its body instead of rejecting', async () => {
      const body = {
        status: 'unavailable',
        checks: [{ name: 'database', status: 'error', latency_ms: 2001, error: 'timeout' }],
      };
      server.use(http.get(LIVE_URL, () => HttpResponse.json(body, { status: 503 })));
      const { client } = createClient();

      await expect(client.probe('/health/live')).resolves.toEqual({ status: 503, body });
    });

    it('gives no body when the answer is not JSON', async () => {
      server.use(
        http.get(LIVE_URL, () => new HttpResponse('<html>Backoffice</html>', { status: 200 })),
      );
      const { client } = createClient();

      await expect(client.probe('/health/live')).resolves.toEqual({
        status: 200,
        body: undefined,
      });
    });

    it('never asks for the token, never sends it and sends no cookies', async () => {
      let authorization: string | null | undefined;
      server.use(
        http.get(LIVE_URL, ({ request }) => {
          authorization = request.headers.get('authorization');
          return HttpResponse.json({ status: 'ok' });
        }),
      );
      const credentials = watchCredentials();
      const { client, getAccessToken } = createClient();

      await client.probe('/health/live');

      expect(authorization).toBeNull();
      expect(credentials()).toEqual(['omit']);
      expect(getAccessToken).not.toHaveBeenCalled();
    });

    it('rejects a network failure as a network ApiError', async () => {
      server.use(http.get(LIVE_URL, () => HttpResponse.error()));
      const { client } = createClient();

      await expect(client.probe('/health/live')).rejects.toMatchObject({ kind: 'network' });
    });

    it('rejects with a timeout when its own time limit runs out', async () => {
      vi.useFakeTimers();
      server.use(http.get(LIVE_URL, () => new Promise<Response>(() => undefined)));
      const { client } = createClient();
      const outcome = client
        .probe('/health/live', { timeoutMs: 5_000 })
        .catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(5_000);

      expect(await outcome).toMatchObject({ kind: 'timeout' });
    });

    it('rejects with an AbortError when the caller cancels', async () => {
      server.use(http.get(LIVE_URL, () => new Promise<Response>(() => undefined)));
      const { client } = createClient();
      const controller = new AbortController();
      const outcome = client.probe('/health/live', { signal: controller.signal });
      const assertion = expect(outcome).rejects.toMatchObject({ name: 'AbortError' });

      controller.abort();

      await assertion;
    });
  });
});

describe('createAnonymousHttpClient', () => {
  const PATIENTS_URL = 'https://pacientes.example.test';

  it('never sends the token nor cookies, in its requests and in its probes', async () => {
    const authorizations: (string | null)[] = [];
    server.use(
      http.get(`${PATIENTS_URL}/health/live`, ({ request }) => {
        authorizations.push(request.headers.get('authorization'));
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    const credentials = watchCredentials();
    const client = createAnonymousHttpClient({ baseUrl: PATIENTS_URL });

    await client.get('/health/live', { schema: z.object({ status: z.literal('ok') }) });
    await client.probe('/health/live');

    expect(authorizations).toEqual([null, null]);
    expect(credentials()).toEqual(['omit', 'omit']);
  });

  it('answers a 401 with an ApiError, never with the end of the session', async () => {
    server.use(
      http.get(`${PATIENTS_URL}/health/status`, () =>
        HttpResponse.json({ code: 'unauthenticated', message: 'Sin sesión' }, { status: 401 }),
      ),
    );
    const client = createAnonymousHttpClient({ baseUrl: PATIENTS_URL });

    const failure: unknown = await client
      .get('/health/status', { schema: z.unknown() })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(SessionExpiredError);
    expect(failure).toMatchObject({ status: 401 });
  });
});
