import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { roleRecordDto, userDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import { roleSchema } from '../schemas/role';
import type { CreateUserFormValues } from '../schemas/userForm';
import { createUserWithRoles } from './createUserWithRoles';

const USERS_URL = usersUrl('/api/v1/users');
const NEW_ROLES_URL = usersUrl('/api/v1/users/300/roles');

const MARKETING = roleSchema.parse(roleRecordDto({ id: 4, name: 'Marketing' }));
const DOCTOR = roleSchema.parse(roleRecordDto({ id: 6, name: 'Doctor' }));

const VALUES: CreateUserFormValues = {
  email: 'nora@clinica.com',
  firstName: 'Nora',
  paternalLastName: 'Díaz',
  maternalLastName: '',
  password: 'Segura-123',
  roleIds: [4, 6],
};

/** What the service received, in order: the creation, the assignments and anything else. */
function serve(options: { createStatus?: number; failRole?: number } = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const record = async (request: Request) => {
    const text = await request.clone().text();
    const body: unknown = text === '' ? null : JSON.parse(text);
    calls.push({ method: request.method, path: new URL(request.url).pathname, body });
  };
  server.use(
    http.post(USERS_URL, async ({ request }) => {
      await record(request);
      return options.createStatus === undefined
        ? HttpResponse.json(userDto({ id: 300, email: 'nora@clinica.com', first_name: 'Nora' }), {
            status: 201,
          })
        : HttpResponse.json(errorBody('user_email_already_registered'), {
            status: options.createStatus,
          });
    }),
    http.post(NEW_ROLES_URL, async ({ request }) => {
      await record(request);
      const body: unknown = await request.json();
      const roleId =
        typeof body === 'object' &&
        body !== null &&
        'role_id' in body &&
        typeof body.role_id === 'number'
          ? body.role_id
          : -1;
      return roleId === options.failRole
        ? HttpResponse.json(errorBody('role_not_found'), { status: 404 })
        : HttpResponse.json({ user_id: 300, role: { id: roleId, name: 'x' } }, { status: 201 });
    }),
    http.delete(usersUrl('/api/v1/users/:userId'), async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

describe('createUserWithRoles', () => {
  it('creates the user first and then assigns each role, in the order of their ids (FR-023)', async () => {
    const calls = serve();
    const { client } = createUsersClient();

    const outcome = await createUserWithRoles(client, VALUES, [DOCTOR, MARKETING]);

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /proxy/users/api/v1/users',
      'POST /proxy/users/api/v1/users/300/roles',
      'POST /proxy/users/api/v1/users/300/roles',
    ]);
    expect(calls.slice(1).map((call) => call.body)).toEqual([{ role_id: 4 }, { role_id: 6 }]);
    expect(outcome.kind).toBe('created');
  });

  it('sends the data of the user without the roles, and without the maternal last name when empty', async () => {
    const calls = serve();
    const { client } = createUsersClient();

    await createUserWithRoles(client, VALUES, [MARKETING]);

    expect(calls[0]?.body).toEqual({
      email: 'nora@clinica.com',
      password: 'Segura-123',
      first_name: 'Nora',
      paternal_last_name: 'Díaz',
    });
  });

  it('gives the user and the roles assigned when everything works', async () => {
    serve();
    const { client } = createUsersClient();

    const outcome = await createUserWithRoles(client, VALUES, [MARKETING, DOCTOR]);

    expect(outcome).toMatchObject({ kind: 'created', user: { id: 300, firstName: 'Nora' } });
    expect(outcome.assigned.map((role) => role.name)).toEqual(['Marketing', 'Doctor']);
  });

  it('does not assign anything, and fails, when the user cannot be created', async () => {
    const calls = serve({ createStatus: 409 });
    const { client } = createUsersClient();

    const failure: unknown = await createUserWithRoles(client, VALUES, [MARKETING, DOCTOR]).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, code: 'user_email_already_registered' });
    expect(calls.map((call) => call.method)).toEqual(['POST']);
  });

  it('keeps the user, and what was assigned, when a role fails: there is no compensation (FR-023)', async () => {
    const calls = serve({ failRole: 6 });
    const { client } = createUsersClient();

    const outcome = await createUserWithRoles(client, VALUES, [MARKETING, DOCTOR]);

    expect(outcome.kind).toBe('partial');
    if (outcome.kind !== 'partial') {
      throw new Error('Expected a partial outcome');
    }
    expect(outcome.user).toMatchObject({ id: 300 });
    expect(outcome.assigned.map((role) => role.name)).toEqual(['Marketing']);
    expect(outcome.failed.map((failure) => failure.role.name)).toEqual(['Doctor']);
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });
});
