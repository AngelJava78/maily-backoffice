import { vi } from 'vitest';

import { createHttpClient } from '@/shared/api/httpClient';

import { SUBSCRIPTIONS_API_BASE_URL } from './handlers/subscriptionsCatalog/baseUrl';
import type { ServiceAnswer } from './usersClient';

export { errorBody } from './usersClient';

/** The address of a path of the subscriptions API in the tests: `subscriptionsUrl('/api/v1/subscriptions')`. */
export function subscriptionsUrl(path: string): string {
  return `${SUBSCRIPTIONS_API_BASE_URL}${path}`;
}

/** An HTTP client for the API tests that sends the token of the given Auth0 account. */
export function createSubscriptionsClient(sub = 'auth0|admin') {
  const onSessionExpired = vi.fn<() => void>();
  const client = createHttpClient({
    baseUrl: SUBSCRIPTIONS_API_BASE_URL,
    getAccessToken: () => Promise.resolve(`test-token:${sub}`),
    onSessionExpired,
  });
  return { client, onSessionExpired, authorization: `Bearer test-token:${sub}` };
}

/**
 * Calls the simulator of the subscriptions API with `fetch` as the interface would, without the
 * client of the application: `callSubscriptions('/api/v1/subscriptions/7')`. By default it asks as
 * the administrator; a `sub` of `null` sends no token at all, and `rawBody` sends a text as it is.
 */
export async function callSubscriptions(
  path: string,
  options: {
    readonly sub?: string | null;
    readonly method?: string;
    readonly body?: unknown;
    readonly rawBody?: string;
  } = {},
): Promise<ServiceAnswer> {
  const { sub = 'auth0|admin', method = 'GET', body, rawBody } = options;
  const headers: Record<string, string> = {};
  if (sub !== null) {
    headers.Authorization = `Bearer test-token:${sub}`;
  }
  if (body !== undefined || rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(subscriptionsUrl(path), {
    method,
    headers,
    body: rawBody ?? (body === undefined ? null : JSON.stringify(body)),
  });
  const text = await response.text();
  const parsed: unknown = text === '' ? null : JSON.parse(text);
  return { status: response.status, body: parsed, headers: response.headers };
}
