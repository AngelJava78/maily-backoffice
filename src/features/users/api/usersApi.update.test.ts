import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { userDto } from '@/test/factories';
import { server } from '@/test/server';
import { createUsersClient, errorBody, usersUrl } from '@/test/usersClient';

import type { UpdateUserBody } from '../schemas/userForm';
import { updateUser } from './usersApi';

const USER_URL = usersUrl('/api/v1/users/121');

const BODY: UpdateUserBody = {
  first_name: 'Anita',
  paternal_last_name: 'Pérez',
  maternal_last_name: 'Gómez',
};

describe('updateUser', () => {
  it('sends the three fields as JSON and gives the user that was changed', async () => {
    const seen: { method: string; contentType: string | null; body: unknown }[] = [];
    server.use(
      http.patch(USER_URL, async ({ request }) => {
        seen.push({
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        });
        return HttpResponse.json(userDto({ first_name: 'Anita' }));
      }),
    );
    const { client } = createUsersClient();

    const user = await updateUser(client, 121, BODY);

    expect(seen).toEqual([{ method: 'PATCH', contentType: 'application/json', body: BODY }]);
    expect(seen[0]?.body).not.toHaveProperty('email');
    expect(user).toMatchObject({ id: 121, firstName: 'Anita' });
  });

  it('sends null to erase the maternal last name', async () => {
    let received: unknown;
    server.use(
      http.patch(USER_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(userDto({ maternal_last_name: null }));
      }),
    );
    const { client } = createUsersClient();

    const user = await updateUser(client, 121, { ...BODY, maternal_last_name: null });

    expect(received).toMatchObject({ maternal_last_name: null });
    expect(user.maternalLastName).toBeNull();
  });

  it.each([
    [404, 'user_not_found'],
    [409, 'user_blocked'],
    [409, 'user_deleted'],
    [422, 'validation_error'],
  ])('passes a %i %s on as an ApiError with its status and code', async (status, code) => {
    server.use(http.patch(USER_URL, () => HttpResponse.json(errorBody(code), { status })));
    const { client } = createUsersClient();

    const failure: unknown = await updateUser(client, 121, BODY).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });

  it('can be cancelled with the signal it receives', async () => {
    server.use(http.patch(USER_URL, () => new Promise<Response>(() => undefined)));
    const { client } = createUsersClient();
    const controller = new AbortController();
    const assertion = expect(
      updateUser(client, 121, BODY, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});
