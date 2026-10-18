import { USERS_API_BASE_URL } from '../usersService';

/** A request the simulator received, as a test wants to see it. */
export interface RecordedRequest {
  readonly method: string;
  /** The path without the base of the service: `/api/v1/users/121`. */
  readonly path: string;
  /** The query string with its question mark, or an empty text. */
  readonly search: string;
  /** The JSON body, or `null` when the request had none. */
  readonly body: unknown;
  readonly authorization: string | null;
  /** The client gave up before the simulator answered. */
  aborted: boolean;
}

const BASE_PATH = new URL(USERS_API_BASE_URL).pathname.replace(/\/+$/, '');

export function relativePath(url: string): string {
  const { pathname } = new URL(url);
  return pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.clone().text();
  if (text.trim() === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

/** Keeps every request in the order it arrived, so a test can check what the interface sent. */
export function createRequestLog() {
  const requests: RecordedRequest[] = [];

  return {
    requests,
    async record(request: Request): Promise<RecordedRequest> {
      const recorded: RecordedRequest = {
        method: request.method,
        path: relativePath(request.url),
        search: new URL(request.url).search,
        body: await readBody(request),
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
