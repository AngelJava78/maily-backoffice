import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import {
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
  type DirectoryUser,
} from './index';

const VALID = {
  email: 'nora@clinica.com',
  password: 'Segura-123',
  first_name: 'Nora',
  paternal_last_name: 'Díaz',
};

function start(extra: readonly DirectoryUser[] = []) {
  const base = defaultDirectory();
  return createUsersDirectoryMock({ ...base, users: [...base.users, ...extra] });
}

const create = (body: unknown, sub?: string | null) =>
  callService('/api/v1/users', { method: 'POST', body, ...(sub === undefined ? {} : { sub }) });

function fieldsOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'errors' in body && Array.isArray(body.errors)
    ? body.errors.map((error: unknown) =>
        typeof error === 'object' && error !== null && 'field' in error ? error.field : undefined,
      )
    : undefined;
}

describe('POST /api/v1/users', () => {
  it('creates an active user the way the service does, and answers 201 with its address', async () => {
    const mock = start();

    const answer = await create({
      email: '  Nora@Clinica.COM ',
      password: 'Segura-123',
      first_name: ' Nora ',
      paternal_last_name: ' Díaz ',
      maternal_last_name: '',
    });

    expect(answer.status).toBe(201);
    expect(answer.headers.get('location')).toMatch(/\/api\/v1\/users\/2$/);
    expect(answer.body).toMatchObject({
      id: 2,
      email: 'nora@clinica.com',
      first_name: 'Nora',
      paternal_last_name: 'Díaz',
      maternal_last_name: null,
      status: { id: 1 },
    });
    expect(answer.body).toHaveProperty('auth0_id', 'auth0|sim-2');
    expect(JSON.stringify(answer.body)).not.toContain('Segura-123');
    expect(mock.state.findUser(2)?.email).toBe('nora@clinica.com');
  });

  it('keeps the maternal last name when it is given', async () => {
    start();

    const answer = await create({ ...VALID, maternal_last_name: 'Vega' });

    expect(answer.body).toMatchObject({ maternal_last_name: 'Vega' });
  });

  it.each([
    ['active', 1],
    ['blocked', 2],
    ['deleted', 3],
  ])('refuses an email that belongs to a %s user, whatever its case', async (_label, statusId) => {
    const mock = start([directoryUser({ id: 2, email: 'nora@clinica.com', statusId })]);

    const answer = await create({ ...VALID, email: 'NORA@clinica.com' });

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'user_email_already_registered' });
    expect(mock.state.users()).toHaveLength(2);
  });

  it('refuses auth0_id, which the service assigns, with a 422 that names it', async () => {
    const mock = start();

    const answer = await create({ ...VALID, auth0_id: 'auth0|mine' });

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ code: 'validation_error' });
    expect(fieldsOf(answer.body)).toContain('auth0_id');
    expect(mock.state.users()).toHaveLength(1);
  });

  it.each([
    ['no email', { ...VALID, email: undefined }, 'email'],
    ['an email without the format', { ...VALID, email: 'no-es-correo' }, 'email'],
    [
      'an email of more than 255 characters',
      { ...VALID, email: `${'a'.repeat(251)}@x.co` },
      'email',
    ],
    ['no password', { ...VALID, password: undefined }, 'password'],
    ['an empty password', { ...VALID, password: '' }, 'password'],
    ['no first name', { ...VALID, first_name: undefined }, 'first_name'],
    ['a first name of only spaces', { ...VALID, first_name: '   ' }, 'first_name'],
    [
      'a first name of more than 100 characters',
      { ...VALID, first_name: 'N'.repeat(101) },
      'first_name',
    ],
    ['no paternal last name', { ...VALID, paternal_last_name: undefined }, 'paternal_last_name'],
    [
      'a maternal last name of more than 100 characters',
      { ...VALID, maternal_last_name: 'M'.repeat(101) },
      'maternal_last_name',
    ],
  ])('answers 422 for %s, naming the field %s', async (_label, body, field) => {
    const mock = start();

    const answer = await create(body);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ code: 'validation_error' });
    expect(fieldsOf(answer.body)).toContain(field);
    expect(mock.state.users()).toHaveLength(1);
  });

  it('names every field that is wrong, not only the first', async () => {
    start();

    const answer = await create({
      email: 'x',
      password: '',
      first_name: '',
      paternal_last_name: '',
    });

    expect(fieldsOf(answer.body)).toEqual([
      'email',
      'password',
      'first_name',
      'paternal_last_name',
    ]);
  });

  it('answers 422 when the body is not an object', async () => {
    start();

    expect((await create('texto')).status).toBe(422);
    expect((await callService('/api/v1/users', { method: 'POST' })).status).toBe(422);
  });

  it('asks for users:write before looking at the body', async () => {
    const mock = start();
    mock.revoke('Administrator', 'users:write');

    const answer = await create({});

    expect(answer.status).toBe(403);
    expect(answer.body).toMatchObject({ code: 'permission_denied' });
  });

  describe('the access account (the last thing checked)', () => {
    it('refuses an email that already has an access account with 409 auth0_account_already_exists', async () => {
      const mock = start();
      mock.identity.accountExists('NORA@clinica.com');

      const answer = await create(VALID);

      expect(answer.status).toBe(409);
      expect(answer.body).toMatchObject({ code: 'auth0_account_already_exists' });
      expect(mock.state.users()).toHaveLength(1);
    });

    it('refuses a password that is too weak with 422 password_rejected', async () => {
      const mock = start();
      mock.rejectPassword();

      const answer = await create(VALID);

      expect(answer.status).toBe(422);
      expect(answer.body).toMatchObject({ code: 'password_rejected' });
      expect(mock.state.users()).toHaveLength(1);
    });

    it('answers 503 identity_provider_unavailable when the provider does not answer, and creates nobody', async () => {
      const mock = start();
      mock.identity.unavailable();

      const answer = await create(VALID);

      expect(answer.status).toBe(503);
      expect(answer.body).toMatchObject({ code: 'identity_provider_unavailable' });
      expect(mock.state.users()).toHaveLength(1);
    });

    it('answers 502 identity_provider_error when the provider refuses, and creates nobody', async () => {
      const mock = start();
      mock.identity.rejected();

      const answer = await create(VALID);

      expect(answer.status).toBe(502);
      expect(answer.body).toMatchObject({ code: 'identity_provider_error' });
      expect(mock.state.users()).toHaveLength(1);
    });

    it('creates the user again once the provider recovers', async () => {
      const mock = start();
      mock.identity.unavailable();
      await create(VALID);

      mock.identity.recover();
      mock.rejectPassword(false);
      const answer = await create(VALID);

      expect(answer.status).toBe(201);
    });

    it('is checked after the validation and after the duplicates', async () => {
      const mock = start([directoryUser({ id: 2, email: 'nora@clinica.com' })]);
      mock.identity.unavailable();

      expect((await create({ ...VALID, email: 'no-es-correo' })).status).toBe(422);
      expect((await create(VALID)).status).toBe(409);
    });
  });
});
