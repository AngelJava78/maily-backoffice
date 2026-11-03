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
const changeStatus = (roleId: number, action: 'block' | 'unblock', sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}/${action}`, { method: 'POST', sub });

// `Array.isArray` narrows to `any[]`, which would make every element `any` from here on; this
// predicate's declared type is what the compiler trusts instead, so each entry stays `unknown`.
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** The `field` of each entry of a `validation_error` body's `errors`, without casting it. */
function fieldsOf(body: unknown): string[] {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('errors' in body) ||
    !isUnknownArray(body.errors)
  ) {
    return [];
  }
  const fields: string[] = [];
  for (const entry of body.errors) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'field' in entry &&
      typeof entry.field === 'string'
    ) {
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

    const answer = await post({
      name: '  Auditor  ',
      description: 'Revisa registros.',
      type_id: 1,
    });

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

describe('POST /api/v1/roles/:roleId/block and /unblock (feature 025)', () => {
  it('blocks an active role: it leaves the active list and appears in the blocked one', async () => {
    start();

    const answer = await changeStatus(7, 'block');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: 7, status: { id: 2, name: 'Bloqueado' } });
    expect(idsOf((await callService('/api/v1/roles', { sub: ADMIN })).body)).not.toContain(7);
    expect(idsOf((await callService('/api/v1/roles?status_id=2', { sub: ADMIN })).body)).toEqual([
      7,
    ]);
  });

  it('unblocks it as it was, with the same permissions', async () => {
    const { users } = start();
    users.grant('Doctor', 'roles:read');
    await changeStatus(7, 'block');

    const answer = await changeStatus(7, 'unblock');

    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ id: 7, name: 'Doctor', status: { id: 1, name: 'Activo' } });
    expect(users.state.findRole(7)?.permissions).toEqual(['roles:read']);
  });

  it('answers 409 when the role already has the status asked for', async () => {
    start();
    await changeStatus(7, 'block');

    const again = await changeStatus(7, 'block');
    const active = await changeStatus(6, 'unblock');

    expect(again).toMatchObject({ status: 409, body: { code: 'role_already_blocked' } });
    expect(active).toMatchObject({ status: 409, body: { code: 'role_already_active' } });
  });

  it('answers 404 for a role that does not exist or is deleted', async () => {
    start();
    await remove(7);

    expect(await changeStatus(7, 'block')).toMatchObject({
      status: 404,
      body: { code: 'role_not_found' },
    });
    expect(await changeStatus(99, 'unblock')).toMatchObject({
      status: 404,
      body: { code: 'role_not_found' },
    });
  });

  it('a blocked role cannot be read, changed or deleted (404), as in the service', async () => {
    start();
    await changeStatus(7, 'block');

    expect((await callService('/api/v1/roles/7/permissions', { sub: ADMIN })).status).toBe(404);
    expect((await patch(7, { name: 'Médico' })).status).toBe(404);
    expect((await remove(7)).status).toBe(404);
  });

  it('asks for roles:update', async () => {
    const { users } = start();
    users.revoke('Administrator', 'roles:update');

    const answer = await changeStatus(7, 'block');

    expect(answer).toMatchObject({ status: 403, body: { code: 'permission_denied' } });
  });
});
