import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import {
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
  type DirectoryUser,
} from './index';

const BLOCKED = 2;
const DELETED = 3;

function start(extra: readonly DirectoryUser[] = []) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 121,
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
      ...extra,
    ],
  });
}

const patch = (body: unknown, path = '/api/v1/users/121', sub?: string) =>
  callService(path, { method: 'PATCH', body, ...(sub === undefined ? {} : { sub }) });

function fieldsOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'errors' in body && Array.isArray(body.errors)
    ? body.errors.map((error: unknown) =>
        typeof error === 'object' && error !== null && 'field' in error ? error.field : undefined,
      )
    : undefined;
}

describe('PATCH /api/v1/users/{id}', () => {
  it('changes the name and the last names of an active user and answers the user', async () => {
    const mock = start();
    const before = mock.state.getUser(121).updatedAt;

    const answer = await patch({
      first_name: ' Anita ',
      paternal_last_name: ' Pérez Ruiz ',
      maternal_last_name: ' Gómez ',
    });

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({
      id: 121,
      first_name: 'Anita',
      paternal_last_name: 'Pérez Ruiz',
      maternal_last_name: 'Gómez',
      email: 'user121@ejemplo.com',
    });
    expect(mock.state.getUser(121).updatedAt > before).toBe(true);
  });

  it('changes only the fields it receives', async () => {
    start();

    const answer = await patch({ first_name: 'Anita' });

    expect(answer.body).toMatchObject({
      first_name: 'Anita',
      paternal_last_name: 'Pérez',
      maternal_last_name: 'Gómez',
    });
  });

  it.each([null, '', '   '])('erases the maternal last name when it comes as %j', async (value) => {
    start();

    const answer = await patch({ maternal_last_name: value });

    expect(answer.body).toMatchObject({ maternal_last_name: null });
  });

  it.each([
    ['a blocked user', 'user_blocked', BLOCKED],
    ['a deleted user', 'user_deleted', DELETED],
    ['a user in an unknown status', 'user_not_active', 9],
  ])('refuses %s with 409 %s and changes nothing', async (_label, code, statusId) => {
    const mock = start([directoryUser({ id: 130, statusId, firstName: 'Beto' })]);

    const answer = await patch({ first_name: 'Otro' }, '/api/v1/users/130');

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code });
    expect(mock.state.getUser(130).firstName).toBe('Beto');
  });

  it('answers 404 for a user that does not exist', async () => {
    start();

    const answer = await patch({ first_name: 'Otro' }, '/api/v1/users/999');

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'user_not_found' });
  });

  it('answers 422 naming body when there is nothing to change', async () => {
    start();

    const answer = await patch({});

    expect(answer.status).toBe(422);
    expect(fieldsOf(answer.body)).toEqual(['body']);
  });

  it.each([
    ['email', { email: 'otro@clinica.com' }],
    ['auth0_id', { auth0_id: 'auth0|otro' }],
    ['a field that does not exist', { apodo: 'Ani' }],
  ])('refuses %s: the email cannot be changed from here', async (_label, body) => {
    const mock = start();

    const answer = await patch({ first_name: 'Anita', ...body });

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ code: 'validation_error' });
    expect(mock.state.getUser(121).firstName).toBe('Ana');
  });

  it.each([
    ['an empty first name', { first_name: '' }, 'first_name'],
    ['a first name of only spaces', { first_name: '   ' }, 'first_name'],
    ['a first name of more than 100 characters', { first_name: 'N'.repeat(101) }, 'first_name'],
    ['an empty paternal last name', { paternal_last_name: '' }, 'paternal_last_name'],
    [
      'a maternal last name of more than 100 characters',
      { maternal_last_name: 'M'.repeat(101) },
      'maternal_last_name',
    ],
  ])('answers 422 for %s, naming %s', async (_label, body, field) => {
    start();

    const answer = await patch(body);

    expect(answer.status).toBe(422);
    expect(fieldsOf(answer.body)).toContain(field);
  });

  it('answers 422 naming user_id for an id that is not a number', async () => {
    start();

    const answer = await patch({ first_name: 'Anita' }, '/api/v1/users/abc');

    expect(fieldsOf(answer.body)).toEqual(['user_id']);
  });

  it('asks for users:update before looking at anything else', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:update');

    const answer = await patch({}, '/api/v1/users/999');

    expect(answer.status).toBe(403);
  });

  it('keeps the last of two changes: there is no control of concurrency', async () => {
    start();

    await patch({ first_name: 'Beto' });
    const second = await patch({ first_name: 'Carla' });

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ first_name: 'Carla' });
  });
});
