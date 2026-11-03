import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createWrapper } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import type { RolePermissionsLocation } from '../schemas/rolePermissionsLocation';
import { roleKeys } from './roleKeys';
import { useRevealRole } from './useRevealRole';

const SYSTEM: Role['type'] = { id: 1, name: 'Sistema' };
const CLINIC: Role['type'] = { id: 2, name: 'Clínica' };
const ALL_ACTIVE: RolePermissionsLocation = {
  type: 'all',
  status: 'active',
  page: 1,
  pageSize: 10,
};

/** A role named so that the order by name is the order of the ids, as the API gives them. */
function role(id: number, type: Role['type'] = SYSTEM): Role {
  return {
    id,
    name: `Role ${String(id).padStart(2, '0')}`,
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    status: { id: 1, name: 'Activo' },
    type,
  };
}

/** `count` active roles of Sistema, ids 1 to `count`. */
const systemRoles = (count: number) => Array.from({ length: count }, (_, index) => role(index + 1));

/** The hook with the list of active roles in the cache of queries, when there is one. */
function setup(activeRoles?: readonly Role[]) {
  const { wrapper, queryClient } = createWrapper({
    auth0: { isAuthenticated: true, user: auth0User({ sub: 'auth0|roles-admin' }) },
  });
  if (activeRoles !== undefined) {
    queryClient.setQueryData(roleKeys.list('active'), activeRoles);
  }
  const { result } = renderHook(() => useRevealRole(), { wrapper });
  return { reveal: result.current, queryClient };
}

describe('useRevealRole (research D7, data-model §7)', () => {
  it('switches Bloqueados to Activos and Clínica to Sistema when the new role is of Sistema, keeping the page size', () => {
    const created = role(1);
    const { reveal } = setup([created]);

    const revealed = reveal({ type: 'clinic', status: 'blocked', page: 3, pageSize: 25 }, created);

    expect(revealed.location).toEqual({ type: 'system', status: 'active', page: 1, pageSize: 25 });
    expect(revealed.search).toBe('?type=sistema&page_size=25');
  });

  it('keeps Todos, because that table already shows the new role, and only switches to Activos', () => {
    const created = role(1, CLINIC);
    const { reveal } = setup([created]);

    const revealed = reveal({ ...ALL_ACTIVE, status: 'blocked' }, created);

    expect(revealed.location).toEqual(ALL_ACTIVE);
    expect(revealed.search).toBe('');
  });

  it('keeps the type that already shows the new role', () => {
    const created = role(1);
    const { reveal } = setup([created]);

    const revealed = reveal({ ...ALL_ACTIVE, type: 'system' }, created);

    expect(revealed.location.type).toBe('system');
    expect(revealed.search).toBe('?type=sistema');
  });

  it('goes to the page where the role is: the 11th of 12 roles is on page 2', () => {
    const roles = systemRoles(12);
    const { reveal } = setup(roles);

    const revealed = reveal(ALL_ACTIVE, role(11));

    expect(revealed.location.page).toBe(2);
    expect(revealed.search).toBe('?page=2');
  });

  it('counts the page of the role by the page size of the table', () => {
    const { reveal } = setup(systemRoles(12));

    const revealed = reveal({ ...ALL_ACTIVE, pageSize: 25 }, role(11));

    expect(revealed.location.page).toBe(1);
    expect(revealed.search).toBe('?page_size=25');
  });

  it('counts only the roles of the type that the table shows', () => {
    // Even ids are of Clínica: the 11th role of the list is the 6th one of Sistema.
    const roles = Array.from({ length: 12 }, (_, index) =>
      role(index + 1, (index + 1) % 2 === 0 ? CLINIC : SYSTEM),
    );
    const { reveal } = setup(roles);

    const onlySystem = reveal({ ...ALL_ACTIVE, type: 'system' }, role(11));
    const everyone = reveal(ALL_ACTIVE, role(11));

    expect(onlySystem.location.page).toBe(1);
    expect(onlySystem.search).toBe('?type=sistema');
    expect(everyone.location.page).toBe(2);
    expect(everyone.search).toBe('?page=2');
  });

  it('shows the first page, with no page in the address, when the cache has no list of active roles', () => {
    const { reveal } = setup();

    const revealed = reveal({ ...ALL_ACTIVE, type: 'clinic', page: 4 }, role(11));

    expect(revealed.location).toEqual({ type: 'system', status: 'active', page: 1, pageSize: 10 });
    expect(revealed.search).toBe('?type=sistema');
  });

  it('shows the first page when the list in the cache does not have the role', () => {
    const { reveal } = setup(systemRoles(12));

    const revealed = reveal(ALL_ACTIVE, role(99));

    expect(revealed.location.page).toBe(1);
    expect(revealed.search).toBe('');
  });

  it('reads the cache when it is called, not when the hook renders', () => {
    const { reveal, queryClient } = setup();
    queryClient.setQueryData(roleKeys.list('active'), systemRoles(12));

    const revealed = reveal(ALL_ACTIVE, role(11));

    expect(revealed.location.page).toBe(2);
  });
});
