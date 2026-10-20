import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import {
  ADMIN_AUTH0,
  createUsersDirectoryMock,
  defaultDirectory,
  directoryUser,
} from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { describeUserError } from '../api/userErrors';
import { userKeys } from './userKeys';
import { useRemoveUserRole } from './useRemoveUserRole';
import { uuidOf } from '@/test/ids';

function setup() {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: uuidOf(121) })],
  });
  mock.assign(uuidOf(121), 4);
  mock.assign(uuidOf(121), 6);
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useRemoveUserRole(uuidOf(121)), { wrapper });
  return { mock, queryClient, ...hook };
}

describe('useRemoveUserRole', () => {
  it('takes the role away from the user and marks its roles as stale', async () => {
    const { mock, queryClient, result } = setup();
    queryClient.setQueryData(userKeys.roles(uuidOf(121)), []);

    act(() => {
      result.current.mutate({ role: { id: 4, name: 'Marketing' } });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mock.state.rolesOf(uuidOf(121)).map((role) => role.name)).toEqual(['Doctor']);
    expect(queryClient.getQueryState(userKeys.roles(uuidOf(121)))?.isInvalidated).toBe(true);
  });

  it('fails with a change that was already done, which is told apart, and still refreshes the roles', async () => {
    const { queryClient, result } = setup();
    queryClient.setQueryData(userKeys.roles(uuidOf(121)), []);

    act(() => {
      result.current.mutate({ role: { id: 5, name: 'Billing' } });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(describeUserError(result.current.error, 'unassignRole').kind).toBe('alreadyDone');
    expect(queryClient.getQueryState(userKeys.roles(uuidOf(121)))?.isInvalidated).toBe(true);
  });

  it('fails, without retrying, when the status of the user does not admit the change', async () => {
    const { mock, result } = setup();
    mock.setUserStatus(uuidOf(121), 2);

    act(() => {
      result.current.mutate({ role: { id: 4, name: 'Marketing' } });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(describeUserError(result.current.error, 'unassignRole').kind).toBe('statusChanged');
    expect(mock.requestsTo('DELETE', /\/roles\/4$/)).toHaveLength(1);
  });
});
