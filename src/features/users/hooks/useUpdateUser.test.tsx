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

import { userKeys } from './userKeys';
import { useUpdateUser } from './useUpdateUser';

function setup(statusId = 1) {
  const base = defaultDirectory();
  const mock = createUsersDirectoryMock({
    ...base,
    users: [
      ...base.users,
      directoryUser({
        id: 121,
        statusId,
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
      }),
    ],
  });
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useUpdateUser(121), { wrapper });
  return { mock, queryClient, ...hook };
}

describe('useUpdateUser', () => {
  it('sends the three fields of the form, and never the email', async () => {
    const { mock, result } = setup();

    act(() => {
      result.current.mutate({
        values: { firstName: ' Anita ', paternalLastName: 'Pérez', maternalLastName: ' ' },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mock.requestsTo('PATCH', '/api/v1/users/121')[0]?.body).toEqual({
      first_name: 'Anita',
      paternal_last_name: 'Pérez',
      maternal_last_name: null,
    });
    expect(result.current.data).toMatchObject({ firstName: 'Anita', maternalLastName: null });
  });

  it('keeps the user it gets in the cache and marks the lists and the searches as stale', async () => {
    const { queryClient, result } = setup();
    const list = userKeys.list({ page: 1, pageSize: 10 });
    const search = userKeys.search('user121@ejemplo.com');
    queryClient.setQueryData(list, 'a page');
    queryClient.setQueryData(search, null);

    act(() => {
      result.current.mutate({
        values: { firstName: 'Anita', paternalLastName: 'Pérez', maternalLastName: 'Gómez' },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(userKeys.detail(121))).toMatchObject({ firstName: 'Anita' });
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(search)?.isInvalidated).toBe(true);
  });

  it('fails, without retrying, when the status of the user does not admit the change', async () => {
    const { mock, queryClient, result } = setup(2);
    queryClient.setQueryData(userKeys.detail(121), 'the user as it was believed to be');

    act(() => {
      result.current.mutate({
        values: { firstName: 'Anita', paternalLastName: 'Pérez', maternalLastName: '' },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 409, code: 'user_blocked' });
    expect(mock.requestsTo('PATCH', '/api/v1/users/121')).toHaveLength(1);
    // What the screen believed about the user is out of date: it has to ask for it again.
    expect(queryClient.getQueryState(userKeys.detail(121))?.isInvalidated).toBe(true);
  });

  it('leaves what is cached as it is when the service refuses the values', async () => {
    const { queryClient, result } = setup();
    queryClient.setQueryData(userKeys.detail(121), 'the user');

    act(() => {
      result.current.mutate({
        values: { firstName: 'A'.repeat(101), paternalLastName: 'Pérez', maternalLastName: '' },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ status: 422, code: 'validation_error' });
    expect(queryClient.getQueryState(userKeys.detail(121))?.isInvalidated).toBe(false);
  });
});
