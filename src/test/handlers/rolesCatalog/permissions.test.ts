import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock } from '../usersDirectory/index';
import { createRolesCatalogMock, richClinicModulesScenario, rolesCatalogScenario } from './index';

const ADMIN = 'auth0|roles-admin';

// `Array.isArray` narrows to `any[]`, which would make every element `any` from here on; this
// predicate's declared type is what the compiler trusts instead, so `item` stays `unknown`.
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** The `name` of each item of a JSON array answer, without casting the body away from `unknown`. */
function namesOf(body: unknown): string[] {
  if (!isUnknownArray(body)) {
    return [];
  }
  const names: string[] = [];
  for (const item of body) {
    if (typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string') {
      names.push(item.name);
    }
  }
  return names;
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

function start(scenario: ReturnType<typeof rolesCatalogScenario> = rolesCatalogScenario()) {
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

const list = (roleId: number, sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}/permissions`, { sub });
const associate = (roleId: number, permissionId: number, sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}/permissions`, {
    method: 'POST',
    body: { permission_id: permissionId },
    sub,
  });
const disassociate = (roleId: number, permissionId: number, sub = ADMIN) =>
  callService(`/api/v1/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE', sub });

describe('GET /api/v1/roles/:roleId/permissions', () => {
  it("lists Administrator's permissions resolved against the modules catalog", async () => {
    start();

    const answer = await list(1);

    expect(answer.status).toBe(200);
    const names = namesOf(answer.body);
    expect(names).toContain('users:read');
    expect(names).toHaveLength(16);
    const usersRead = isUnknownArray(answer.body)
      ? answer.body.find(
          (permission) =>
            typeof permission === 'object' &&
            permission !== null &&
            'name' in permission &&
            permission.name === 'users:read',
        )
      : undefined;
    expect(usersRead).toMatchObject({
      module: { key: 'users' },
      action: { key: 'read', name: 'Ver' },
    });
  });

  it('answers an empty list for a role with no permissions', async () => {
    start();

    const answer = await list(2);

    expect(answer.body).toEqual([]);
  });

  it('answers 404 for a role that does not exist', async () => {
    start();

    expect((await list(999)).status).toBe(404);
  });
});

describe('POST /api/v1/roles/:roleId/permissions', () => {
  it('associates a permission of the same type and answers 201 with role and permission', async () => {
    start();

    const answer = await associate(2, 1);

    expect(answer.status).toBe(201);
    expect(answer.body).toMatchObject({
      role: { id: 2, name: 'Developer', type: { id: 1 } },
      permission: { id: 1, name: 'users:read' },
    });
  });

  it('associates a Clínica permission to a Clínica role', async () => {
    start(richClinicModulesScenario());

    const answer = await associate(7, 17);

    expect(answer.status).toBe(201);
    expect(answer.body).toMatchObject({ permission: { id: 17, name: 'patients:read' } });
  });

  it("rejects a permission whose module type does not match the role's type", async () => {
    start();

    const answer = await associate(7, 1);

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'role_permission_module_type_conflict' });
  });

  it('rejects a permission already associated', async () => {
    start();

    const answer = await associate(1, 1);

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'role_permission_already_associated' });
  });

  it('answers 404 role_not_found checked before the permission', async () => {
    start();

    const answer = await associate(999, 999);

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'role_not_found' });
  });

  it('answers 404 permission_not_found for a role that exists', async () => {
    start();

    const answer = await associate(2, 999);

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ code: 'permission_not_found' });
  });

  it('rejects a body with an unknown field or a non-integer permission_id', async () => {
    start();

    expect((await associate(2, 1.5)).status).toBe(422);
    const extraField = await callService('/api/v1/roles/2/permissions', {
      method: 'POST',
      body: { permission_id: 1, extra: true },
      sub: ADMIN,
    });
    expect(extraField.status).toBe(422);
  });

  it('refuses the operation without roles:update', async () => {
    start();

    expect((await associate(2, 1, 'auth0|nobody')).status).toBe(403);
  });
});

describe('DELETE /api/v1/roles/:roleId/permissions/:permissionId', () => {
  it('disassociates a permission and answers 204', async () => {
    start();

    const answer = await disassociate(1, 1);

    expect(answer.status).toBe(204);
    const remaining = await list(1);
    expect(idsOf(remaining.body)).not.toContain(1);
  });

  it('rejects a permission that was not associated', async () => {
    start();

    const answer = await disassociate(2, 1);

    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({ code: 'role_permission_not_associated' });
  });
});
