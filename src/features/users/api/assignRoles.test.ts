import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError, SessionExpiredError } from '@/shared/api/ApiError';
import { createHttpClient } from '@/shared/api/httpClient';
import { roleRecordDto } from '@/test/factories';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { roleSchema } from '../schemas/role';
import { assignRoles } from './assignRoles';

const ROLES_URL = usersUrl('/api/v1/users/121/roles');

const role = (id: number, name: string) => roleSchema.parse(roleRecordDto({ id, name }));
const MARKETING = role(4, 'Marketing');
const DOCTOR = role(6, 'Doctor');
const SUPPORT = role(9, 'Support');

type Answer = (roleId: number) => Response | Promise<Response>;

/** Answers every assignment with `answer` and keeps, in order, the events that it saw. */
function serve(
  answer: Answer = () =>
    HttpResponse.json({ user_id: 121, role: { id: 0, name: 'x' } }, { status: 201 }),
) {
  const events: string[] = [];
  server.use(
    http.post(ROLES_URL, async ({ request }) => {
      const body: unknown = await request.json();
      const roleId =
        typeof body === 'object' &&
        body !== null &&
        'role_id' in body &&
        typeof body.role_id === 'number'
          ? body.role_id
          : -1;
      events.push(`start:${roleId}`);
      await delay(5);
      const response = await answer(roleId);
      events.push(`end:${roleId}`);
      return response;
    }),
  );
  return events;
}

const created = (roleId: number, name = 'x') =>
  HttpResponse.json({ user_id: 121, role: { id: roleId, name } }, { status: 201 });

describe('assignRoles', () => {
  it('assigns the roles one by one, in the order of their ids, never at the same time', async () => {
    const events = serve((roleId) => created(roleId));
    const { client } = createUsersClient();

    const result = await assignRoles(client, 121, [SUPPORT, MARKETING, DOCTOR]);

    expect(events).toEqual(['start:4', 'end:4', 'start:6', 'end:6', 'start:9', 'end:9']);
    expect(result.assigned.map((assigned) => assigned.id)).toEqual([4, 6, 9]);
    expect(result.failed).toEqual([]);
  });

  it('does nothing for an empty list', async () => {
    const events = serve();
    const { client } = createUsersClient();

    await expect(assignRoles(client, 121, [])).resolves.toEqual({ assigned: [], failed: [] });
    expect(events).toEqual([]);
  });

  it('goes on after an error of business, such as a role that is gone, and says which one failed', async () => {
    const events = serve((roleId) =>
      roleId === 6
        ? HttpResponse.json(errorBody('role_not_found'), { status: 404 })
        : created(roleId),
    );
    const { client } = createUsersClient();

    const result = await assignRoles(client, 121, [MARKETING, DOCTOR, SUPPORT]);

    expect(events.filter((event) => event.startsWith('start'))).toEqual([
      'start:4',
      'start:6',
      'start:9',
    ]);
    expect(result.assigned.map((assigned) => assigned.id)).toEqual([4, 9]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.role).toBe(DOCTOR);
    expect(result.failed[0]?.error).toMatchObject({ status: 404, code: 'role_not_found' });
  });

  it('stops at a failure of the infrastructure: that role and the ones not tried are pending', async () => {
    const events = serve((roleId) =>
      roleId === 6
        ? HttpResponse.json(errorBody('authentication_unavailable'), { status: 503 })
        : created(roleId),
    );
    const { client } = createUsersClient();

    const result = await assignRoles(client, 121, [MARKETING, DOCTOR, SUPPORT]);

    expect(events.filter((event) => event.startsWith('start'))).toEqual(['start:4', 'start:6']);
    expect(result.assigned.map((assigned) => assigned.id)).toEqual([4]);
    expect(result.failed.map((failure) => failure.role.id)).toEqual([6, 9]);
    for (const failure of result.failed) {
      expect(failure.error).toMatchObject({ status: 503 });
    }
  });

  it('stops when the network fails, because the rest would fail too', async () => {
    server.use(http.post(ROLES_URL, () => HttpResponse.error()));
    const { client } = createUsersClient();

    const result = await assignRoles(client, 121, [MARKETING, DOCTOR]);

    expect(result.assigned).toEqual([]);
    expect(result.failed.map((failure) => failure.role.id)).toEqual([4, 6]);
    expect(result.failed[0]?.error).toMatchObject({ kind: 'network' });
  });

  it('stops when the service does not answer in time', async () => {
    server.use(http.post(ROLES_URL, () => new Promise<Response>(() => undefined)));
    const client = createHttpClient({
      baseUrl: USERS_API_BASE_URL,
      getAccessToken: () => Promise.resolve('test-token:auth0|admin'),
      onSessionExpired: () => undefined,
      timeoutMs: 40,
    });

    const result = await assignRoles(client, 121, [MARKETING, DOCTOR]);

    expect(result.failed.map((failure) => failure.role.id)).toEqual([4, 6]);
    expect(result.failed[0]?.error).toMatchObject({ kind: 'timeout' });
  });

  it('counts a role that the user already has as assigned', async () => {
    serve((roleId) =>
      roleId === 4
        ? HttpResponse.json(errorBody('user_role_already_associated'), { status: 409 })
        : created(roleId),
    );
    const { client } = createUsersClient();

    const result = await assignRoles(client, 121, [MARKETING, DOCTOR]);

    expect(result.assigned.map((assigned) => assigned.id)).toEqual([4, 6]);
    expect(result.failed).toEqual([]);
  });

  it('gives up with the error of the session, which is not a failure of one role', async () => {
    server.use(
      http.post(ROLES_URL, () => HttpResponse.json(errorBody('invalid_token'), { status: 401 })),
    );
    const { client } = createUsersClient();

    const failure: unknown = await assignRoles(client, 121, [MARKETING, DOCTOR]).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(SessionExpiredError);
  });

  it('gives up when the signal is cancelled', async () => {
    serve((roleId) => created(roleId));
    const { client } = createUsersClient();
    const controller = new AbortController();
    controller.abort();

    const failure: unknown = await assignRoles(client, 121, [MARKETING], controller.signal).catch(
      (error: unknown) => error,
    );

    expect(failure).not.toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ name: 'AbortError' });
  });
});
