import { describe, expect, it } from 'vitest';

import { callService } from '@/test/usersClient';

import { createUsersDirectoryMock } from '../usersDirectory/index';
import { createRolesCatalogMock, richClinicModulesScenario, rolesCatalogScenario } from './index';

const ADMIN = 'auth0|roles-admin';

function start(scenario: ReturnType<typeof rolesCatalogScenario> = rolesCatalogScenario()) {
  const users = createUsersDirectoryMock(scenario.directory);
  return createRolesCatalogMock(users.state, scenario);
}

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

describe('GET /api/v1/permissions', () => {
  it('lists the whole catalog, resolved, sorted by name', async () => {
    start();

    const answer = await callService('/api/v1/permissions', { sub: ADMIN });

    expect(answer.status).toBe(200);
    const names = namesOf(answer.body);
    expect(names).toHaveLength(16);
    expect(names).toEqual([...names].sort());
  });

  it('refuses the operation without permissions:read', async () => {
    start();

    expect((await callService('/api/v1/permissions', { sub: 'auth0|nobody' })).status).toBe(403);
  });
});

describe('GET /api/v1/modules', () => {
  it('filters by type_id, sorted by sort_order then name', async () => {
    start();

    const answer = await callService('/api/v1/modules?type_id=1', { sub: ADMIN });

    expect(answer.body).toEqual([
      expect.objectContaining({ key: 'users', sort_order: 10 }),
      expect.objectContaining({ key: 'roles', sort_order: 20 }),
      expect.objectContaining({ key: 'permissions', sort_order: 30 }),
      expect.objectContaining({ key: 'modules', sort_order: 40 }),
    ]);
  });

  it('answers an empty list for a type with no modules yet', async () => {
    start();

    const answer = await callService('/api/v1/modules?type_id=2', { sub: ADMIN });

    expect(answer.body).toEqual([]);
  });

  it('answers modules of both types when type_id is omitted (real API, modules.py)', async () => {
    start(richClinicModulesScenario());

    const answer = await callService('/api/v1/modules', { sub: ADMIN });

    expect(answer.body).toHaveLength(7);
  });

  it('refuses the operation without modules:read', async () => {
    start();

    expect((await callService('/api/v1/modules?type_id=1', { sub: 'auth0|nobody' })).status).toBe(
      403,
    );
  });
});

describe('GET /api/v1/role-types', () => {
  it('answers the fixed catalog of the two role types', async () => {
    start();

    const answer = await callService('/api/v1/role-types', { sub: ADMIN });

    expect(answer.body).toEqual([
      { id: 1, name: 'Sistema' },
      { id: 2, name: 'Clínica' },
    ]);
  });
});
