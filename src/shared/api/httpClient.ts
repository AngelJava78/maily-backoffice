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
}

export type GetOptions<TSchema extends z.ZodType> = Pick<
  RequestOptions<TSchema>,
  'schema' | 'query' | 'signal'
>;

export interface HttpClient {
  request: <TSchema extends z.ZodType>(
    options: RequestOptions<TSchema>,
  ) => Promise<z.output<TSchema>>;
  get: <TSchema extends z.ZodType>(
    path: string,
    options: GetOptions<TSchema>,
  ) => Promise<z.output<TSchema>>;
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

interface RawResponse {
  readonly status: number;
  readonly text: string;
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
 * The only HTTP client of the application (constitution IV). It validates every response, tells
 * apart network failures, time-outs and contract failures, renews the token once on a 401 and
 * sends the token only to the host of its base URL.
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { getAccessToken, onSessionExpired, timeoutMs = DEFAULT_TIMEOUT_MS } = config;
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

  async function obtainToken(options?: GetTokenOptions): Promise<string> {
    try {
      return await (options === undefined ? getAccessToken() : getAccessToken(options));
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        onSessionExpired();
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
    callerSignal: AbortSignal | undefined,
    tokenOptions?: GetTokenOptions,
  ): Promise<string> {
    try {
      return await runWithTimeout(callerSignal, timeoutMs, (limit) =>
        abandonWhenAborted(limit, obtainToken(tokenOptions)),
      );
    } catch (error) {
      throw error instanceof Abandoned ? toTransportError(error.reason, callerSignal) : error;
    }
  }

  async function exchange(
    url: URL,
    options: RequestOptions<z.ZodType>,
    token: string | null,
  ): Promise<RawResponse> {
    const headers = new Headers({ Accept: 'application/json' });
    if (token !== null) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await runWithTimeout(options.signal, timeoutMs, async (signal) => {
        const response = await fetch(url, {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? null : JSON.stringify(options.body),
          signal,
        });
        return { status: response.status, text: await response.text() };
      });
    } catch (error) {
      throw toTransportError(error, options.signal);
    }
  }

  async function request<TSchema extends z.ZodType>(
    options: RequestOptions<TSchema>,
  ): Promise<z.output<TSchema>> {
    const url = buildUrl(options.path, options.query);
    // The token goes to the configured host only, never to an address that merely was asked for.
    const sendsToken = url.origin === base.origin;

    let response = await exchange(
      url,
      options,
      sendsToken ? await acquireToken(options.signal) : null,
    );
    if (sendsToken && response.status === 401) {
      response = await exchange(
        url,
        options,
        await acquireToken(options.signal, { cacheMode: 'off' }),
      );
      if (response.status === 401) {
        onSessionExpired();
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

  return {
    request,
    get: (path, options) => request({ ...options, path, method: 'GET' }),
  };
}
