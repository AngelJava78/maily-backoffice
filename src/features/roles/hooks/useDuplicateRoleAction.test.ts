import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import { useDuplicateRoleAction } from './useDuplicateRoleAction';
import { useRolesCatalog } from './useRolesCatalog';

const ADMIN_SUB = 'auth0|roles-admin';

function start() {
  const scenario = rolesCatalogScenario();
  const users = createUsersDirectoryMock(scenario.directory);
  const roles = createRolesCatalogMock(users.state, scenario);
  return { users, roles };
}

function wrapperFor() {
  return createWrapper({ auth0: { isAuthenticated: true, user: auth0User({ sub: ADMIN_SUB }) } });
}

describe('useDuplicateRoleAction', () => {
  it('duplicates the role and calls onDuplicated with the new one', async () => {
    start();
    const onDuplicated = vi.fn<(role: Role) => void>();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useDuplicateRoleAction(1, onDuplicated), { wrapper });

    act(() => {
      result.current.duplicate();
    });

    await waitFor(() => {
      expect(onDuplicated).toHaveBeenCalledOnce();
    });
    expect(onDuplicated.mock.calls[0]?.[0]).toMatchObject({ name: 'Administrator (copia)' });
  });

  it('reports pending while the duplicate is in flight', async () => {
    const { roles } = start();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useDuplicateRoleAction(1, vi.fn()), { wrapper });
    const release = roles.defer();

    act(() => {
      result.current.duplicate();
    });

    await waitFor(() => {
      expect(result.current.pending).toBe(true);
    });
    release();
  });

  it('does not call onDuplicated when the role no longer exists', async () => {
    start();
    const onDuplicated = vi.fn<(role: Role) => void>();
    const { wrapper } = wrapperFor();
    const { result: list } = renderHook(() => useRolesCatalog(), { wrapper });
    await waitFor(() => {
      expect(list.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useDuplicateRoleAction(999, onDuplicated), { wrapper });

    act(() => {
      result.current.duplicate();
    });

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
    });
    expect(onDuplicated).not.toHaveBeenCalled();
  });
});
