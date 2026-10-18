import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { logger } from '@/shared/lib/logger';
import { userDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import type { CreateUserBody } from '../schemas/userForm';
import { createUser } from './usersApi';

const USERS_URL = usersUrl('/api/v1/users');

const BODY: CreateUserBody = {
  email: 'nora@clinica.com',
  password: 'Segura-123',
  first_name: 'Nora',
  paternal_last_name: 'Díaz',
  maternal_last_name: 'Vega',
};

describe('createUser', () => {
  it('sends exactly the body it is given as JSON, without auth0_id, and gives the user created', async () => {
    const seen: { method: string; contentType: string | null; body: unknown }[] = [];
    server.use(
      http.post(USERS_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        });
        return HttpResponse.json(
          userDto({ id: 300, email: 'nora@clinica.com', first_name: 'Nora' }),
          {
            status: 201,
            headers: { Location: '/api/v1/users/300' },
          },
        );
      }),
    );
    const { client } = createUsersClient();

    const user = await createUser(client, BODY);

    expect(seen).toEqual([{ method: 'POST', contentType: 'application/json', body: BODY }]);
    expect(seen[0]?.body).not.toHaveProperty('auth0_id');
    expect(user).toMatchObject({ id: 300, firstName: 'Nora', email: 'nora@clinica.com' });
  });

  it('leaves the maternal last name out when the body has none', async () => {
    let received: unknown;
    server.use(
      http.post(USERS_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(userDto({ id: 301 }), { status: 201 });
      }),
    );
    const { client } = createUsersClient();
    const withoutMaternal: CreateUserBody = {
      email: BODY.email,
      password: BODY.password,
      first_name: BODY.first_name,
      paternal_last_name: BODY.paternal_last_name,
    };

    await createUser(client, withoutMaternal);

    expect(received).not.toHaveProperty('maternal_last_name');
  });

  it('never logs the body, which carries the password, whether the service accepts it or refuses it', async () => {
    const spies = [
      ...(['debug', 'info', 'warn', 'error'] as const).map((level) =>
        vi.spyOn(logger, level).mockImplementation(() => undefined),
      ),
      ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
        vi.spyOn(console, level).mockImplementation(() => undefined),
      ),
    ];
    server.use(
      http.post(USERS_URL, () => HttpResponse.json(userDto({ id: 302 }), { status: 201 })),
    );
    const { client } = createUsersClient();

    await createUser(client, BODY);
    server.use(
      http.post(USERS_URL, () =>
        HttpResponse.json(errorBody('password_rejected'), { status: 422 }),
      ),
    );
    await createUser(client, BODY).catch(() => undefined);

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it.each([
    [409, 'user_email_already_registered'],
    [409, 'auth0_account_already_exists'],
    [422, 'password_rejected'],
    [502, 'identity_provider_error'],
    [503, 'identity_provider_unavailable'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.post(USERS_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await createUser(client, BODY).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('passes a 422 validation_error on with the fields that the service names', async () => {
    server.use(
      http.post(USERS_URL, () =>
        HttpResponse.json(
          errorBody('validation_error', [
            { field: 'email', message: 'El correo no es válido.' },
            { field: 'first_name', message: 'El nombre es obligatorio.' },
          ]),
          { status: 422 },
        ),
      ),
    );
    const { client } = createUsersClient();

    const failure: unknown = await createUser(client, BODY).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      status: 422,
      code: 'validation_error',
      fieldErrors: [
        { field: 'email', message: 'El correo no es válido.' },
        { field: 'first_name', message: 'El nombre es obligatorio.' },
      ],
    });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    server.use(http.post(USERS_URL, () => HttpResponse.json({ id: 1 }, { status: 201 })));
    const { client } = createUsersClient();

    const failure: unknown = await createUser(client, BODY).catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind: 'contract' });
  });
});
