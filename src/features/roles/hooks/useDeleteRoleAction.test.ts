import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { createRolesCatalogMock, rolesCatalogScenario } from '@/test/handlers/rolesCatalog';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { useDeleteRoleAction } from './useDeleteRoleAction';

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

describe('useDeleteRoleAction', () => {
  it('starts closed; start() opens it', () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRoleAction(5, vi.fn()), { wrapper });

    expect(result.current.open).toBe(false);
    act(() => {
      result.current.start();
    });
    expect(result.current.open).toBe(true);
  });

  it('confirm() deletes the role, closes, and calls onDeleted', async () => {
    const { users } = start();
    const onDeleted = vi.fn<() => void>();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRoleAction(5, onDeleted), { wrapper });

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.open).toBe(false);
    });
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(users.state.findRole(5)?.statusId).not.toBe(1);
  });

  it('cancel() closes without deleting anything', () => {
    start();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRoleAction(5, vi.fn()), { wrapper });

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.open).toBe(false);
  });

  it('closes and does not call onDeleted when the deletion fails', async () => {
    const { roles } = start();
    roles.failNext({
      method: 'DELETE',
      path: '/api/v1/roles/5',
      status: 500,
      code: 'internal_error',
    });
    const onDeleted = vi.fn<() => void>();
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => useDeleteRoleAction(5, onDeleted), { wrapper });

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.open).toBe(false);
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
