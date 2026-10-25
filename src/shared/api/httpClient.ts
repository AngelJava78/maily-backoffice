import type { z } from 'zod';

import { ApiError, SessionExpiredError } from './ApiError';
import { runWithTimeout } from './timeout';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface GetTokenOptions {
  /** `off` skips the in-memory cache and asks the provider for a fresh token. */
  readonly cacheMode?: 'on' | 'off';
}

/** Gives the access token of the current session; it throws `SessionExpiredError` when it cannot. */
export type GetAccessToken = (options?: GetTokenOptions) => Promise<string>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined;

export interface RequestOptions<TSchema extends z.ZodType> {
  /** Path relative to the base URL (`/api/v1/...`), or an absolute URL. */
  readonly path: string;
  /** Every response body is validated with this schema (constitution II). */
  readonly schema: TSchema;
  readonly method?: HttpMethod;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  /**
   * For the public routes of the platform (feature 016, research D3): it neither asks for the
   * token of the session nor sends it, it sends no cookies, and a 401 is one more error, so it
   * works when the token cannot be obtained and never ends the session.
   */
  readonly anonymous?: boolean;
  /** Time limit of this request, body included, instead of the one of the client. */
  readonly timeoutMs?: number;
}

export type GetOptions<TSchema extends z.ZodType> = Pick<
  RequestOptions<TSchema>,
  'schema' | 'query' | 'signal' | 'anonymous' | 'timeoutMs'
>;

export interface ProbeOptions {
  readonly signal?: AbortSignal;
  /** Time limit of the probe, instead of the one of the client. */
  readonly timeoutMs?: number;
}

/** What a probe gets back, whatever the status of the answer. */
export interface ProbeResult {
  readonly status: number;
  /** The JSON body, or `undefined` when it is empty or not JSON. Not validated: the caller does. */
  readonly body: unknown;
}

export interface HttpClient {
  request: <TSchema extends z.ZodType>(
    options: RequestOptions<TSchema>,
  ) => Promise<z.output<TSchema>>;
  get: <TSchema extends z.ZodType>(
    path: string,
    options: GetOptions<TSchema>,
  ) => Promise<z.output<TSchema>>;
  /**
   * An anonymous `GET` for the public health routes of the services (feature 016, research D3): it
   * answers with the status and the body whatever the status, because the 503 of `/health/ready`
   * is an answer of the health contract, not an error. A network failure, a time-out and a
   * cancellation still reject as in `request`. Only the direct check uses it (ESLint keeps it so).
   */
  probe: (path: string, options?: ProbeOptions) => Promise<ProbeResult>;
}

export interface HttpClientConfig {
  /** Base URL of the API: an absolute URL or a path of this origin such as `/proxy/users`. */
  readonly baseUrl: string;
  readonly getAccessToken: GetAccessToken;
  /** Called once when the session cannot continue; the client then throws `SessionExpiredError`. */
  readonly onSessionExpired: () => void;
  /** Time limit of each request, body included. */
  readonly timeoutMs?: number;
}

export interface AnonymousHttpClientConfig {
  /** Base URL of the service: an absolute URL or a path of this origin such as `/proxy/patients`. */
  readonly baseUrl: string;
  /** Time limit of each request, body included. */
  readonly timeoutMs?: number;
}

/** How the client gets the token of the session and gives up on it; none for an anonymous one. */
interface Session {
  readonly getAccessToken: GetAccessToken;
  readonly onSessionExpired: () => void;
}

interface RawResponse {
  readonly status: number;
  readonly text: string;
}

/** What `exchange` needs of a request. */
interface Exchange {
  readonly method: HttpMethod;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
  readonly token: string | null;
  readonly anonymous: boolean;
}

function hasName(value: unknown, name: string): boolean {
  return typeof value === 'object' && value !== null && 'name' in value && value.name === name;
}

function isAbsoluteUrl(path: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(path);
}

/** The body of a response, or `undefined` when it is empty or not JSON. */
function parseJson(text: string): unknown {
  if (text.trim() === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Thrown when work that cannot be cancelled is given up, to tell it from the work failing. */
class Abandoned extends Error {
  readonly reason: unknown;

  constructor(reason: unknown) {
    super('The operation was abandoned');
    this.name = 'Abandoned';
    this.reason = reason;
  }
}

/** Stops waiting for `work` as soon as `signal` aborts; `work` itself keeps running unattended. */
function abandonWhenAborted<T>(signal: AbortSignal, work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abandon = (): void => {
      reject(new Abandoned(signal.reason));
    };
    if (signal.aborted) {
      abandon();
    } else {
      signal.addEventListener('abort', abandon, { once: true });
    }
    work
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener('abort', abandon);
      })
      .catch(() => undefined);
  });
}

/**
 * The only HTTP client of the application (constitution IV), built with or without a session. It
 * validates every response, tells apart network failures, time-outs and contract failures, renews
 * the token once on a 401 and sends the token only to the host of its base URL.
 */
function buildClient(
  config: { readonly baseUrl: string; readonly timeoutMs?: number },
  session: Session | null,
): HttpClient {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const base = new URL(config.baseUrl.replace(/\/+$/, ''), window.location.origin);
  const baseHref = base.href.replace(/\/+$/, '');

  function buildUrl(path: string, query: RequestOptions<z.ZodType>['query']): URL {
    const url = new URL(
      isAbsoluteUrl(path) ? path : `${baseHref}${path.startsWith('/') ? '' : '/'}${path}`,
    );
    for (const [name, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.append(name, String(value));
      }
    }
    return url;
  }

  async function obtainToken(active: Session, options?: GetTokenOptions): Promise<string> {
    try {
      return await (options === undefined
        ? active.getAccessToken()
        : active.getAccessToken(options));
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        active.onSessionExpired();
      }
      throw error;
    }
  }

  /** A caller that gave up keeps its own reason, an expired limit is a timeout, the rest is network. */
  function toTransportError(error: unknown, callerSignal: AbortSignal | undefined): unknown {
    if (callerSignal?.aborted === true) {
      const reason: unknown = callerSignal.reason;
      return hasName(reason, 'TimeoutError') ? ApiError.timeout() : reason;
    }
    if (hasName(error, 'TimeoutError')) {
      return ApiError.timeout();
    }
    return hasName(error, 'AbortError') ? error : ApiError.network(error);
  }

  /**
   * Gets a token within the time of the request. Asking Auth0 cannot be cancelled and can be slow,
   * so it is given up when the time limit runs out or the caller cancels, as the request is, and
   * the time budget of the caller (FR-005) covers it.
   */
  async function acquireToken(
    active: Session,
    callerSignal: AbortSignal | undefined,
    limitMs: number,
    tokenOptions?: GetTokenOptions,
  ): Promise<string> {
    try {
      return await runWithTimeout(callerSignal, limitMs, (limit) =>
        abandonWhenAborted(limit, obtainToken(active, tokenOptions)),
      );
    } catch (error) {
      throw error instanceof Abandoned ? toTransportError(error.reason, callerSignal) : error;
    }
  }

  async function exchange(url: URL, request: Exchange): Promise<RawResponse> {
    const headers = new Headers({ Accept: 'application/json' });
    if (request.token !== null) {
      headers.set('Authorization', `Bearer ${request.token}`);
    }
    if (request.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await runWithTimeout(request.signal, request.timeoutMs, async (signal) => {
        const response = await fetch(url, {
          method: request.method,
          headers,
          body: request.body === undefined ? null : JSON.stringify(request.body),
          signal,
          // An anonymous request carries no credential of the browser either (FR-076 of 016).
          ...(request.anonymous ? { credentials: 'omit' as const } : {}),
        });
        return { status: response.status, text: await response.text() };
      });
    } catch (error) {
      throw toTransportError(error, request.signal);
    }
  }

  async function request<TSchema extends z.ZodType>(
    options: RequestOptions<TSchema>,
  ): Promise<z.output<TSchema>> {
    const url = buildUrl(options.path, options.query);
    const limitMs = options.timeoutMs ?? timeoutMs;
    const anonymous = options.anonymous === true || session === null;
    // The token goes to the configured host only, never to an address that merely was asked for.
    const active = !anonymous && url.origin === base.origin ? session : null;
    const send = (token: string | null): Promise<RawResponse> =>
      exchange(url, {
        method: options.method ?? 'GET',
        body: options.body,
        signal: options.signal,
        timeoutMs: limitMs,
        token,
        anonymous,
      });

    let response = await send(
      active === null ? null : await acquireToken(active, options.signal, limitMs),
    );
    if (active !== null && response.status === 401) {
      response = await send(
        await acquireToken(active, options.signal, limitMs, { cacheMode: 'off' }),
      );
      if (response.status === 401) {
        active.onSessionExpired();
        throw new SessionExpiredError({
          cause: ApiError.fromResponse(response.status, parseJson(response.text)),
        });
      }
    }

    if (response.status < 200 || response.status >= 300) {
      throw ApiError.fromResponse(response.status, parseJson(response.text));
    }

    const parsed = options.schema.safeParse(parseJson(response.text));
    if (!parsed.success) {
      throw ApiError.contract(
        response.status,
        `The response does not match the contract: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  async function probe(path: string, options: ProbeOptions = {}): Promise<ProbeResult> {
    const response = await exchange(buildUrl(path, undefined), {
      method: 'GET',
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? timeoutMs,
      token: null,
      anonymous: true,
    });
    return { status: response.status, body: parseJson(response.text) };
  }

  return {
    request,
    get: (path, options) => request({ ...options, path, method: 'GET' }),
    probe,
  };
}

/** The client of a service of the platform, with the token of the session. */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { baseUrl, timeoutMs, getAccessToken, onSessionExpired } = config;
  return buildClient({ baseUrl, timeoutMs }, { getAccessToken, onSessionExpired });
}

/**
 * A client whose every request is anonymous: for the services that the direct check of feature
 * 016 reaches from `VITE_HEALTH_DIRECT_SERVICES`, which never receive the token (research D4).
 */
export function createAnonymousHttpClient(config: AnonymousHttpClientConfig): HttpClient {
  return buildClient(config, null);
}
