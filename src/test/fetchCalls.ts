import { vi } from 'vitest';

/** A call the application made to `fetch`. */
export interface FetchCall {
  readonly url: string;
  /** The credentials mode it asked for; `undefined` is the default of the browser, `same-origin`. */
  readonly credentials: RequestCredentials | undefined;
}

/**
 * Watches the calls to `fetch` with a spy that keeps the real one, so MSW still answers them. MSW
 * rebuilds the request it intercepts and loses its credentials mode (it always reads
 * `same-origin`), so the tests that check that an anonymous request sends no cookies (FR-056 and
 * FR-076 of 016) read it from the calls themselves. `restoreMocks` removes the spy after each test.
 */
export function watchFetchCalls(): () => readonly FetchCall[] {
  const spy = vi.spyOn(globalThis, 'fetch');
  return () =>
    spy.mock.calls.map(([input, init]) => ({
      url: input instanceof Request ? input.url : String(input),
      credentials: init?.credentials,
    }));
}
