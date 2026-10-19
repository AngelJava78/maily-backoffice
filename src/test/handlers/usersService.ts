import { http, HttpResponse } from 'msw';

import { userDto, type RoleDto, type UserDto } from '../factories';
import { server } from '../server';

/** Base URL the tests use for the users service (the relative `/proxy/users` of development). */
export const USERS_API_BASE_URL = 'http://localhost:5173/proxy/users';

/** The records the service keeps about a person: the user and the active roles with permissions. */
export interface MockAccount {
  readonly user: UserDto | null;
  readonly roles: readonly RoleDto[];
}

type Behavior =
  | { readonly kind: 'normal' }
  | { readonly kind: 'fail'; readonly status: number; readonly code: string }
  | { readonly kind: 'hang' }
  | { readonly kind: 'defer'; readonly gate: Promise<void> };

interface RecordedRequest {
  readonly authorization: string | null;
  aborted: boolean;
}

const ERROR_CODES: Readonly<Record<number, string>> = {
  500: 'internal_error',
  503: 'authentication_unavailable',
};

const ACTIVE_STATUS_ID = 1;
const TEST_TOKEN_PREFIX = 'test-token:';

/**
 * Simulates the `me` operation of the users service (contracts/users-service.md, M1) at network
 * level and registers itself in the shared MSW server. The token `Bearer test-token:<sub>` tells
 * who is asking, and the answer follows the rules of the service: a person without a record gets
 * `user: null`, one who is not active gets no roles, and roles come sorted by name.
 */
export function createUsersServiceMock(initial: Readonly<Record<string, MockAccount>> = {}) {
  const accounts = new Map<string, MockAccount>(Object.entries(initial));
  const requests: RecordedRequest[] = [];
  let behavior: Behavior = { kind: 'normal' };

  function answerFor(sub: string) {
    const account = accounts.get(sub);
    if (account === undefined || account.user === null) {
      return { user: null, roles: [] };
    }
    const roles =
      account.user.status.id === ACTIVE_STATUS_ID
        ? [...account.roles].sort((a, b) => a.name.localeCompare(b.name))
        : [];
    return { user: account.user, roles };
  }

  server.use(
    http.get(`${USERS_API_BASE_URL}/api/v1/authorization/me`, async ({ request }) => {
      const recorded: RecordedRequest = {
        authorization: request.headers.get('authorization'),
        aborted: false,
      };
      requests.push(recorded);
      request.signal.addEventListener('abort', () => {
        recorded.aborted = true;
      });

      const current = behavior;
      if (current.kind === 'hang') {
        return new Promise<Response>(() => undefined);
      }
      if (current.kind === 'defer') {
        await current.gate;
      }
      if (current.kind === 'fail') {
        return HttpResponse.json(
          { code: current.code, message: `Error ${current.status}` },
          { status: current.status },
        );
      }

      if (recorded.authorization === null) {
        return HttpResponse.json(
          { code: 'unauthenticated', message: 'Falta el token' },
          { status: 401 },
        );
      }
      const [scheme, token] = recorded.authorization.split(' ');
      if (scheme !== 'Bearer' || !token?.startsWith(TEST_TOKEN_PREFIX)) {
        return HttpResponse.json(
          { code: 'invalid_token', message: 'Token inválido' },
          { status: 401 },
        );
      }
      return HttpResponse.json(answerFor(token.slice(TEST_TOKEN_PREFIX.length)));
    }),
  );

  return {
    /** Every request the service has received, in order. */
    requests,
    get requestCount(): number {
      return requests.length;
    },
    /** How many of the requests were cancelled by the client before being answered. */
    get abortedCount(): number {
      return requests.filter((recorded) => recorded.aborted).length;
    },
    setAccount(sub: string, account: MockAccount): void {
      accounts.set(sub, account);
    },
    removeAccount(sub: string): void {
      accounts.delete(sub);
    },
    /** Changes the status of the user (1 = active, 2 = blocked, 3 = deleted). */
    setStatus(sub: string, status: UserDto['status']): void {
      const account = accounts.get(sub);
      if (account?.user) {
        accounts.set(sub, { ...account, user: userDto({ ...account.user, status }) });
      }
    },
    setRoles(sub: string, roles: readonly RoleDto[]): void {
      const account = accounts.get(sub);
      if (account) {
        accounts.set(sub, { ...account, roles });
      }
    },
    /** From now on the service answers with an error status (500 or 503 for a failing service). */
    failWith(status: number): void {
      behavior = { kind: 'fail', status, code: ERROR_CODES[status] ?? 'internal_error' };
    },
    /** From now on the requests are received but never answered. */
    hang(): void {
      behavior = { kind: 'hang' };
    },
    /** From now on the requests wait until the returned function is called, then are answered. */
    defer(): () => void {
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      behavior = { kind: 'defer', gate };
      return release;
    },
    /** Back to answering normally. */
    recover(): void {
      behavior = { kind: 'normal' };
    },
  };
}

export type UsersServiceMock = ReturnType<typeof createUsersServiceMock>;
