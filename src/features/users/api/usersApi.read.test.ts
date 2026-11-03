import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { userDto, userListItemDto, userPageDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { getUser, getUserByEmail, listUsers } from './usersApi';
import { uuidOf } from '@/test/ids';

const USERS_URL = usersUrl('/api/v1/users');

interface Seen {
  method: string;
  search: string;
  authorization: string | null;
}

/** Answers `url` with `respond` and keeps what the request looked like. */
function serve(url: string, respond: () => Response) {
  const seen: Seen[] = [];
  server.use(
    http.get(url, ({ request }) => {
      seen.push({
        method: request.method,
        search: new URL(request.url).search,
        authorization: request.headers.get('authorization'),
      });
      return respond();
    }),
  );
  return seen;
}

describe('listUsers', () => {
  it('asks for the page, the page size and the status and gives the page in camelCase', async () => {
    const seen = serve(USERS_URL, () =>
      HttpResponse.json(
        userPageDto({
          items: [userListItemDto({}, [{ id: 2, name: 'Clínica' }])],
          total: 34,
          page: 3,
          page_size: 25,
          pages: 2,
        }),
      ),
    );
    const { client, authorization } = createUsersClient();

    const page = await listUsers(client, { page: 3, pageSize: 25, statusId: 1 });

    // Without a type, `role_type_id` is not sent: the service answers users of every type.
    expect(seen).toEqual([
      { method: 'GET', search: '?page=3&page_size=25&status_id=1', authorization },
    ]);
    expect(page).toMatchObject({ total: 34, page: 3, pageSize: 25, pages: 2 });
    expect(page.items[0]).toMatchObject({
      id: uuidOf(121),
      firstName: 'Ana',
      paternalLastName: 'Pérez',
      roleTypes: [{ id: 2, name: 'Clínica' }],
    });
  });

  it.each([
    [{ statusId: 2 } as const, '?page=1&page_size=10&status_id=2'],
    [{ statusId: 1, roleTypeId: 1 } as const, '?page=1&page_size=10&status_id=1&role_type_id=1'],
    [{ statusId: 2, roleTypeId: 2 } as const, '?page=1&page_size=10&status_id=2&role_type_id=2'],
  ])('sends the filters %j as %s (feature 026)', async (filters, search) => {
    const seen = serve(USERS_URL, () => HttpResponse.json(userPageDto()));
    const { client } = createUsersClient();

    await listUsers(client, { page: 1, pageSize: 10, ...filters });

    expect(seen.map((request) => request.search)).toEqual([search]);
  });

  // An API older than 5.5.0 ignores the filters and has no `role_types` (research D2).
  it('reports a page whose users have no role_types as a contract failure', async () => {
    serve(USERS_URL, () => HttpResponse.json({ ...userPageDto(), items: [userDto()] }));
    const { client } = createUsersClient();

    const failure: unknown = await listUsers(client, { page: 1, pageSize: 10, statusId: 2 }).catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    serve(USERS_URL, () => HttpResponse.json({ items: [], total: 0 }));
    const { client } = createUsersClient();

    const failure: unknown = await listUsers(client, { page: 1, pageSize: 10, statusId: 1 }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('passes a 422 validation_error on as an ApiError with its fields', async () => {
    serve(USERS_URL, () =>
      HttpResponse.json(errorBody('validation_error', [{ field: 'page', message: 'Inválida.' }]), {
        status: 422,
      }),
    );
    const { client } = createUsersClient();

    const failure: unknown = await listUsers(client, { page: 0, pageSize: 10, statusId: 1 }).catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({
      status: 422,
      code: 'validation_error',
      fieldErrors: [{ field: 'page', message: 'Inválida.' }],
    });
  });
});

describe('getUserByEmail', () => {
  const BY_EMAIL_URL = usersUrl('/api/v1/users/by-email');

  it('trims the email, sends it encoded and gives the user', async () => {
    const seen = serve(BY_EMAIL_URL, () => HttpResponse.json(userDto()));
    const { client, authorization } = createUsersClient();

    const user = await getUserByEmail(client, ' Ana@Clinica.com ');

    expect(seen).toEqual([{ method: 'GET', search: '?email=Ana%40Clinica.com', authorization }]);
    expect(user).toMatchObject({ id: uuidOf(121), email: 'ana@clinica.com' });
  });

  it('finds a user whatever its status', async () => {
    serve(BY_EMAIL_URL, () => HttpResponse.json(userDto({ status: { id: 3, name: 'Eliminado' } })));
    const { client } = createUsersClient();

    expect((await getUserByEmail(client, 'ana@clinica.com'))?.status).toEqual({
      id: 3,
      name: 'Eliminado',
    });
  });

  it('gives null, and does not fail, when there is no user with that email', async () => {
    serve(BY_EMAIL_URL, () => HttpResponse.json(errorBody('user_not_found'), { status: 404 }));
    const { client } = createUsersClient();

    await expect(getUserByEmail(client, 'nadie@clinica.com')).resolves.toBeNull();
  });

  it.each([
    [422, 'validation_error'],
    [500, 'internal_error'],
    [404, 'something_else'],
  ])('passes a %i %s on, which is not "there is no user"', async (status, code) => {
    serve(BY_EMAIL_URL, () => HttpResponse.json(errorBody(code), { status }));
    const { client } = createUsersClient();

    const failure: unknown = await getUserByEmail(client, 'ana@clinica.com').catch(
      (error: unknown) => error,
    );

    expect(failure).toMatchObject({ status, code });
  });
});

describe('getUser', () => {
  const USER_URL = usersUrl(`/api/v1/users/${uuidOf(121)}`);

  it('asks for the user by its id and gives a blocked one with its status', async () => {
    const seen = serve(USER_URL, () =>
      HttpResponse.json(userDto({ status: { id: 2, name: 'Bloqueado' } })),
    );
    const { client, authorization } = createUsersClient();

    const user = await getUser(client, uuidOf(121));

    expect(seen).toEqual([{ method: 'GET', search: '', authorization }]);
    expect(user.status).toEqual({ id: 2, name: 'Bloqueado' });
  });

  it('passes the 404 on as an ApiError with the code user_not_found', async () => {
    serve(USER_URL, () => HttpResponse.json(errorBody('user_not_found'), { status: 404 }));
    const { client } = createUsersClient();

    const failure: unknown = await getUser(client, uuidOf(121)).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: 'user_not_found' });
  });
});

describe('cancelling', () => {
  it.each([
    [
      'listUsers',
      usersUrl('/api/v1/users'),
      (c: ReturnType<typeof createUsersClient>['client'], signal: AbortSignal) =>
        listUsers(c, { page: 1, pageSize: 10, statusId: 1, signal }),
    ],
    [
      'getUserByEmail',
      usersUrl('/api/v1/users/by-email'),
      (c: ReturnType<typeof createUsersClient>['client'], signal: AbortSignal) =>
        getUserByEmail(c, 'ana@clinica.com', { signal }),
    ],
    [
      'getUser',
      usersUrl(`/api/v1/users/${uuidOf(121)}`),
      (c: ReturnType<typeof createUsersClient>['client'], signal: AbortSignal) =>
        getUser(c, uuidOf(121), { signal }),
    ],
  ])('%s can be cancelled with the signal it receives', async (_name, url, call) => {
    server.use(http.get(url, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(call(client, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });

    controller.abort();

    await assertion;
  });
});
