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
import { useChangeUserStatus } from './useChangeUserStatus';
import { uuidOf } from '@/test/ids';

const ACTIVE = 1;
const BLOCKED = 2;

function setup(statusId = ACTIVE) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [...base.users, directoryUser({ id: uuidOf(121), statusId })],
  });
  mock.assign(uuidOf(121), 4);
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useChangeUserStatus(uuidOf(121)), { wrapper });
  return { mock, queryClient, ...hook };
}

/** What the screens have cached about the user before the change. */
function seed(queryClient: ReturnType<typeof setup>['queryClient']) {
  const list = userKeys.list({ page: 1, pageSize: 10 });
  const search = userKeys.search('user121@ejemplo.com');
  queryClient.setQueryData(userKeys.detail(uuidOf(121)), 'the user as it was');
  queryClient.setQueryData(userKeys.roles(uuidOf(121)), ['Marketing']);
  queryClient.setQueryData(list, 'a page');
  queryClient.setQueryData(search, 'a result');
  return { list, search };
}

describe('useChangeUserStatus: blocking', () => {
  it('blocks the user and gives it back with its new status', async () => {
    const { mock, result } = setup();

    act(() => {
      result.current.mutate({ action: 'block' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mock.requestsTo('POST', `/api/v1/users/${uuidOf(121)}/block`)).toHaveLength(1);
    expect(mock.requestsTo('POST', `/api/v1/users/${uuidOf(121)}/unblock`)).toHaveLength(0);
    expect(result.current.data).toMatchObject({ id: uuidOf(121), status: { id: BLOCKED } });
  });

  it('keeps the user it gets, forgets its roles and marks the lists and the searches as stale', async () => {
    const { queryClient, result } = setup();
    const { list, search } = seed(queryClient);

    act(() => {
      result.current.mutate({ action: 'block' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(userKeys.detail(uuidOf(121)))).toMatchObject({
      status: { id: BLOCKED },
    });
    // The roles of a user that is not active cannot be asked for, so they are not kept.
    expect(queryClient.getQueryData(userKeys.roles(uuidOf(121)))).toBeUndefined();
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(search)?.isInvalidated).toBe(true);
  });

  it('fails, without retrying, when the user has another status, and asks for the user again', async () => {
    const { mock, queryClient, result } = setup(BLOCKED);
    seed(queryClient);

    act(() => {
      result.current.mutate({ action: 'block' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 409, code: 'user_blocked' });
    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(1);
    expect(queryClient.getQueryState(userKeys.detail(uuidOf(121)))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(userKeys.list({ page: 1, pageSize: 10 }))?.isInvalidated).toBe(
      true,
    );
  });

  it('fails, without retrying and keeping what is cached, when the access account cannot be updated', async () => {
    const { mock, queryClient, result } = setup();
    seed(queryClient);
    mock.identity.unavailable();

    act(() => {
      result.current.mutate({ action: 'block' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(describeUserError(result.current.error, 'block').kind).toBe('identityUnavailable');
    expect(mock.requestsTo('POST', /\/block$/)).toHaveLength(1);
    expect(queryClient.getQueryData(userKeys.detail(uuidOf(121)))).toBe('the user as it was');
    expect(queryClient.getQueryState(userKeys.detail(uuidOf(121)))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(userKeys.roles(uuidOf(121)))).toEqual(['Marketing']);
  });
});

describe('useChangeUserStatus: unblocking', () => {
  it('unblocks the user and gives it back active', async () => {
    const { mock, result } = setup(BLOCKED);

    act(() => {
      result.current.mutate({ action: 'unblock' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mock.requestsTo('POST', `/api/v1/users/${uuidOf(121)}/unblock`)).toHaveLength(1);
    expect(result.current.data).toMatchObject({ id: uuidOf(121), status: { id: ACTIVE } });
  });

  it('keeps the user it gets and marks its roles, the lists and the searches as stale', async () => {
    const { queryClient, result } = setup(BLOCKED);
    const { list, search } = seed(queryClient);

    act(() => {
      result.current.mutate({ action: 'unblock' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(userKeys.detail(uuidOf(121)))).toMatchObject({
      status: { id: ACTIVE },
    });
    expect(queryClient.getQueryState(userKeys.roles(uuidOf(121)))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(search)?.isInvalidated).toBe(true);
  });

  it('fails, telling that the person has no access account, and the user stays blocked', async () => {
    const { mock, queryClient, result } = setup(BLOCKED);
    seed(queryClient);
    mock.identity.accountMissing(uuidOf(121));

    act(() => {
      result.current.mutate({ action: 'unblock' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(describeUserError(result.current.error, 'unblock').kind).toBe('accountMissing');
    expect(mock.state.findUser(uuidOf(121))?.statusId).toBe(BLOCKED);
    expect(queryClient.getQueryState(userKeys.detail(uuidOf(121)))?.isInvalidated).toBe(false);
  });
});
