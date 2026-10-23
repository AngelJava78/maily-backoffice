import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock } from '../usersDirectory/index';
import { ADMIN_ID, createRolesCatalogMock, rolesCatalogScenario } from './index';

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

const ADMIN = 'auth0|roles-admin';

const post = (body: unknown, sub = ADMIN) =>
  callService('/api/v1/roles', { method: 'POST', body, sub });
const patch = (roleId: number, body: unknown, sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}`, { method: 'PATCH', body, sub });
const remove = (roleId: number, sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}`, { method: 'DELETE', sub });

// `Array.isArray` narrows to `any[]`, which would make every element `any` from here on; this
// predicate's declared type is what the compiler trusts instead, so each entry stays `unknown`.
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** The `field` of each entry of a `validation_error` body's `errors`, without casting it. */
function fieldsOf(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('errors' in body) || !isUnknownArray(body.errors)) {
    return [];
  }
  const fields: string[] = [];
  for (const entry of body.errors) {
    if (typeof entry === 'object' && entry !== null && 'field' in entry && typeof entry.field === 'string') {
      fields.push(entry.field);
    }
  }
  return fields;
}

/** The `id` of each item of a JSON array answer. */
function idsOf(body: unknown): number[] {
  if (!isUnknownArray(body)) {
    return [];
  }
  const ids: number[] = [];
  for (const item of body) {
    if (typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'number') {
      ids.push(item.id);
    }
  }
  return ids;
}

describe('POST /api/v1/roles', () => {
  it('creates an active role and answers 201 with its address', async () => {
    start();

    const answer = await post({ name: '  Auditor  ', description: 'Revisa registros.', type_id: 1 });

    expect(answer.status).toBe(201);
    expect(answer.headers.get('location')).toMatch(/\/api\/v1\/roles\/10$/);
    expect(answer.body).toMatchObject({
      id: 10,
      name: 'Auditor',
      description: 'Revisa registros.',
      status: { id: 1 },
      type: { id: 1, name: 'Sistema' },
    });
  });

  it('defaults the description to null when it is not sent', async () => {
    start();

    const answer = await post({ name: 'Auditor', type_id: 2 });

    expect(answer.body).toMatchObject({ description: null, type: { id: 2 } });
  });

  it.each([
    [{ description: null, type_id: 1 }, 'name'],
    [{ name: '', type_id: 1 }, 'name'],
    [{ name: 'X'.repeat(51), type_id: 1 }, 'name'],
    [{ name: 'Auditor' }, 'type_id'],
    [{ name: 'Auditor', type_id: 3 }, 'type_id'],
    [{ name: 'Auditor', type_id: true }, 'type_id'],
    [{ name: 'Auditor', type_id: 1.5 }, 'type_id'],
    [{ name: 'Auditor', type_id: '1' }, 'type_id'],
  ])('rejects an invalid body %j with a 422 on %s', async (body, field) => {
    start();

    const answer = await post(body);

    expect(answer.status).toBe(422);
    expect(answer.body).toMatchObject({ code: 'validation_error' });
    expect(fieldsOf(answer.body)).toContain(field);
  });

  it('rejects a name already used by a non-deleted role, of either type', async () => {
    start();

    const answer = await post({ name: 'owner', type_id: 1 });

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'role_name_already_exists' });
  });

  it('refuses the operation without roles:write', async () => {
    start();

    const answer = await post({ name: 'Auditor', type_id: 1 }, 'auth0|nobody');

    expect(answer.status).toBe(403);
  });
});

describe('PATCH /api/v1/roles/:roleId', () => {
  it('changes the name and/or the description of an active role', async () => {
    start();

    const answer = await patch(7, { name: 'Doctor General' });

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ name: 'Doctor General', type: { id: 2, name: 'Clínica' } });
  });

  it('rejects type_id and type even if they match the current type', async () => {
    start();

    const typeId = await patch(7, { type_id: 2 });
    const type = await patch(7, { type: { id: 2 } });

    expect(typeId.status).toBe(422);
    expect(type.status).toBe(422);
  });

  it('requires at least one field', async () => {
    start();

    const answer = await patch(7, {});

    expect(answer.status).toBe(422);
  });

  it('rejects a name already used by another non-deleted role', async () => {
    start();

    const answer = await patch(7, { name: 'developer' });

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'role_name_already_exists' });
  });

  it('answers 404 for a role that does not exist', async () => {
    start();

    const answer = await patch(999, { name: 'X' });

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'role_not_found' });
  });
});

describe('DELETE /api/v1/roles/:roleId', () => {
  it('deletes an active role with 204, even one assigned to a user, and removes it from the catalog', async () => {
    const { users } = start();
    users.assign(ADMIN_ID, 7);

    const answer = await remove(7);

    expect(answer.status).toBe(204);
    const list = await callService('/api/v1/roles', { sub: ADMIN });
    expect(idsOf(list.body)).not.toContain(7);
  });

  it('frees the name: a new role can reuse it afterward', async () => {
    start();
    await remove(7);

    const answer = await post({ name: 'Doctor', type_id: 2 });

    expect(answer.status).toBe(201);
  });

  it('answers 404 for a role that does not exist or is already deleted', async () => {
    start();
    await remove(7);

    const answer = await remove(7);

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'role_not_found' });
  });
});
