import { HttpResponse } from 'msw';

/**
 * The answer of a service that does not answer: it never comes, but it ends as soon as the client
 * gives up the request (its timeout or a cancellation). A handler that never settles keeps MSW's
 * interception of that request open after the test, and then the next request to the same service
 * can go past MSW to the real network: `assignRoles.test.ts` failed so three times in CI, always in
 * the test that follows its timeout.
 */
export function untilAborted(request: Request): Promise<Response> {
  return new Promise<Response>((resolve) => {
    if (request.signal.aborted) {
      resolve(HttpResponse.error());
      return;
    }
    request.signal.addEventListener(
      'abort',
      () => {
        resolve(HttpResponse.error());
      },
      { once: true },
    );
  });
}
