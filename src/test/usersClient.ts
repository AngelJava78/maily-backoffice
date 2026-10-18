import { vi } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';

import { USERS_API_BASE_URL } from './handlers/usersService';

/** The address of a path of the users service in the tests: `usersUrl('/api/v1/users')`. */
export function usersUrl(path: string): string {
  return `${USERS_API_BASE_URL}${path}`;
}

/** An HTTP client for the API tests that sends the token of the given Auth0 account. */
export function createUsersClient(sub = 'auth0|admin') {
  const onSessionExpired = vi.fn<() => void>();
  const client = createHttpClient({
    baseUrl: USERS_API_BASE_URL,
    getAccessToken: () => Promise.resolve(`test-token:${sub}`),
    onSessionExpired,
  });
  return { client, onSessionExpired, authorization: `Bearer test-token:${sub}` };
}

/** What the service answered to a call made straight to the simulator. */
export interface ServiceAnswer {
  readonly status: number;
  /** The JSON body, or `null` when there was none. */
  readonly body: unknown;
  readonly headers: Headers;
}

/**
 * Calls the simulator of the service with `fetch` as the interface would, without the client of the
 * application: `callService('/api/v1/users?page=2')`. By default it asks as the administrator; a
 * `sub` of `null` sends no token at all.
 */
export async function callService(
  path: string,
  options: {
    readonly sub?: string | null;
    readonly method?: string;
    readonly body?: unknown;
  } = {},
): Promise<ServiceAnswer> {
  const { sub = 'auth0|admin', method = 'GET', body } = options;
  const headers: Record<string, string> = {};
  if (sub !== null) {
    headers.Authorization = `Bearer test-token:${sub}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(usersUrl(path), {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed: unknown = text === '' ? null : JSON.parse(text);
  return { status: response.status, body: parsed, headers: response.headers };
}

/** The body the service sends with an error. */
export function errorBody(code: string, errors?: readonly { field: string; message: string }[]) {
  return { code, message: `Mensaje de ${code}`, ...(errors === undefined ? {} : { errors }) };
}
