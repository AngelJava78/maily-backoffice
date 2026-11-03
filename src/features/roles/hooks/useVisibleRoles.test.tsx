import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useVisibleRoles } from './useVisibleRoles';

const ADMIN_SUB = 'auth0|roles-admin';
const BLOCKED = 2;

/** The seed (5 Sistema, 4 Clínica), with Support (Sistema, 3) and Nurse (Clínica, 8) blocked. */
function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  users.setRoleStatus(3, BLOCKED);
  users.setRoleStatus(8, BLOCKED);
  return { users, roles };
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

const namesOf = (roles: readonly { readonly name: string }[]) => roles.map(({ name }) => name);

describe('useVisibleRoles', () => {
  it('gives the active roles of both types, by name, with Todos and Activos', async () => {
    start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useVisibleRoles({ type: 'all', status: 'active' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });
    expect(namesOf(result.current.roles)).toEqual([
      'Administrator',
      'Billing',
      'Developer',
      'Doctor',
      'Marketing',
      'Owner',
      'Receptionist',
    ]);
  });

  it('gives only the roles of the type with Sistema or Clínica (FR-007)', async () => {
    start();
    const { wrapper } = wrapperFor();

    const system = renderHook(() => useVisibleRoles({ type: 'system', status: 'active' }), {
      wrapper,
    });
    await waitFor(() => {
      expect(system.result.current.query.isSuccess).toBe(true);
    });
    expect(namesOf(system.result.current.roles)).toEqual([
      'Administrator',
      'Billing',
      'Developer',
      'Marketing',
    ]);

    const clinic = renderHook(() => useVisibleRoles({ type: 'clinic', status: 'active' }), {
      wrapper,
    });
    await waitFor(() => {
      expect(clinic.result.current.query.isSuccess).toBe(true);
    });
    expect(namesOf(clinic.result.current.roles)).toEqual(['Doctor', 'Owner', 'Receptionist']);
  });

  it('asks for the blocked roles with status_id=2 and gives only those', async () => {
    // `GET /roles` is answered by the directory of the users service, which keeps its own log.
    const { users } = start();
    const { wrapper } = wrapperFor();

    const { result } = renderHook(() => useVisibleRoles({ type: 'all', status: 'blocked' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });
    expect(namesOf(result.current.roles)).toEqual(['Nurse', 'Support']);
    expect(
      users.requests.some(
        (request) =>
          request.method === 'GET' &&
          request.path === '/api/v1/roles' &&
          request.search === '?status_id=2',
      ),
    ).toBe(true);
  });

  it('does not ask for the list of a status again when only the type changes', async () => {
    const { users } = start();
    const { wrapper } = wrapperFor();

    const { result, rerender } = renderHook(
      ({ type }: { readonly type: 'all' | 'system' }) =>
        useVisibleRoles({ type, status: 'active' }),
      { wrapper, initialProps: { type: 'all' } },
    );
    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });
    const listRequests = () => users.requestsTo('GET', '/api/v1/roles');
    const before = listRequests().length;
    expect(before).toBeGreaterThan(0);

    rerender({ type: 'system' });

    expect(namesOf(result.current.roles)).toEqual([
      'Administrator',
      'Billing',
      'Developer',
      'Marketing',
    ]);
    expect(listRequests()).toHaveLength(before);
  });
});
