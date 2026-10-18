import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { roleRecordDto } from '@/test/factories';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { roleSchema } from '../schemas/role';
import { userKeys } from './userKeys';
import { useAssignRoles } from './useAssignRoles';

const MARKETING = roleSchema.parse(roleRecordDto({ id: 4, name: 'Marketing' }));
const DOCTOR = roleSchema.parse(roleRecordDto({ id: 6, name: 'Doctor' }));

function setup() {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: 121 })],
  });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useAssignRoles(121), { wrapper });
  return { mock, queryClient, ...hook };
}

describe('useAssignRoles', () => {
  it('gives the pending roles to the user and says which ones were assigned', async () => {
    const { mock, result } = setup();

    act(() => {
      result.current.mutate({ roles: [MARKETING, DOCTOR] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.assigned.map((role) => role.name)).toEqual(['Marketing', 'Doctor']);
    expect(result.current.data?.failed).toEqual([]);
    expect(mock.state.rolesOf(121).map((role) => role.name)).toEqual(['Marketing', 'Doctor']);
  });

  it('marks the roles of the user as stale so the detail shows the current ones', async () => {
    const { queryClient, result } = setup();
    queryClient.setQueryData(userKeys.roles(121), []);

    act(() => {
      result.current.mutate({ roles: [MARKETING] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryState(userKeys.roles(121))?.isInvalidated).toBe(true);
  });

  it('says which role could not be assigned instead of failing', async () => {
    const { mock, result } = setup();
    mock.setRoleStatus(6, 2);

    act(() => {
      result.current.mutate({ roles: [MARKETING, DOCTOR] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.assigned.map((role) => role.name)).toEqual(['Marketing']);
    expect(result.current.data?.failed.map((failure) => failure.role.name)).toEqual(['Doctor']);
  });
});
