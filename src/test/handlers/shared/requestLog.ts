/** A request a simulator received, as a test wants to see it. */
export interface RecordedRequest {
  readonly method: string;
  /** The path without the base of the service: `/api/v1/users/121`. */
  readonly path: string;
  /** The query string with its question mark, or an empty text. */
  readonly search: string;
  /** The JSON body, or `null` when the request had none or it could not be read. */
  readonly body: unknown;
  /**
   * The body as it arrived, only when it is not readable JSON: a simulator can tell it from a
   * request without body (the subscriptions API refuses it before anything else).
   */
  readonly unreadableBody?: string;
  readonly authorization: string | null;
  /** The client gave up before the simulator answered. */
  aborted: boolean;
}

/** The JSON of a body, or `null` without one; `readable` is false when it is not JSON. */
function parseBody(text: string): { readonly readable: boolean; readonly value: unknown } {
  if (text.trim() === '') {
    return { readable: true, value: null };
  }
  try {
    const value: unknown = JSON.parse(text);
    return { readable: true, value };
  } catch {
    return { readable: false, value: null };
  }
}

/**
 * Keeps every request in the order it arrived, so a test can check what the interface sent. The
 * paths are kept without the base of the service, which is the one received (`baseUrl`).
 */
export function createRequestLog(baseUrl: string) {
  const requests: RecordedRequest[] = [];
  const basePath = new URL(baseUrl).pathname.replace(/\/+$/, '');

  function relativePath(url: string): string {
    const { pathname } = new URL(url);
    return pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  }

  return {
    requests,
    async record(request: Request): Promise<RecordedRequest> {
      const text = await request.clone().text();
      const body = parseBody(text);
      const recorded: RecordedRequest = {
        method: request.method,
        path: relativePath(request.url),
        search: new URL(request.url).search,
        body: body.value,
        ...(body.readable ? {} : { unreadableBody: text }),
        authorization: request.headers.get('authorization'),
        aborted: false,
      };
      requests.push(recorded);
      request.signal.addEventListener('abort', () => {
        recorded.aborted = true;
      });
      return recorded;
    },
  };
}

export type RequestLog = ReturnType<typeof createRequestLog>;
