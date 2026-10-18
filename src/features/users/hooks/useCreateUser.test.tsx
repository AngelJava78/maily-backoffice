import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { roleRecordDto } from '@/test/factories';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { roleSchema } from '../schemas/role';
import type { CreateUserFormValues } from '../schemas/userForm';
import { userKeys } from './userKeys';
import { useCreateUser } from './useCreateUser';

const MARKETING = roleSchema.parse(roleRecordDto({ id: 4, name: 'Marketing' }));
const DOCTOR = roleSchema.parse(roleRecordDto({ id: 6, name: 'Doctor' }));

const VALUES: CreateUserFormValues = {
  email: 'nora@clinica.com',
  firstName: 'Nora',
  paternalLastName: 'Díaz',
  maternalLastName: '',
  password: 'Segura-123',
  roleIds: [4, 6],
};

function setup() {
  const mock = createUsersDirectoryMock();
  const queryClient = createQueryClient();
  const harness = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
  const hook = renderHook(() => useCreateUser(), { wrapper: harness.wrapper });
  return { mock, queryClient, ...hook };
}

describe('useCreateUser', () => {
  it('creates the user and gives it the roles', async () => {
    const { mock, result } = setup();

    act(() => {
      result.current.mutate({ values: VALUES, roles: [MARKETING, DOCTOR] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.kind).toBe('created');
    const created = mock.state.findByEmail('nora@clinica.com');
    expect(created).toBeDefined();
    expect(mock.state.rolesOf(created?.id ?? 0).map((role) => role.name)).toEqual([
      'Marketing',
      'Doctor',
    ]);
  });

  it('keeps the user and the roles in the cache and marks the lists and searches as stale', async () => {
    const { queryClient, result } = setup();
    const list = userKeys.list({ page: 1, pageSize: 10 });
    const search = userKeys.search('nora@clinica.com');
    queryClient.setQueryData(list, 'a page');
    queryClient.setQueryData(search, null);

    act(() => {
      result.current.mutate({ values: VALUES, roles: [DOCTOR, MARKETING] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const id = result.current.data?.user.id ?? 0;
    expect(queryClient.getQueryData(userKeys.detail(id))).toMatchObject({
      email: 'nora@clinica.com',
    });
    expect(queryClient.getQueryData(userKeys.roles(id))).toMatchObject([
      { name: 'Doctor' },
      { name: 'Marketing' },
    ]);
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(search)?.isInvalidated).toBe(true);
  });

  it('is not an error when a role fails: the user exists and the outcome tells what is missing (FR-023)', async () => {
    const { mock, result } = setup();
    mock.setRoleStatus(6, 2);

    act(() => {
      result.current.mutate({ values: VALUES, roles: [MARKETING, DOCTOR] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const outcome = result.current.data;
    expect(outcome?.kind).toBe('partial');
    if (outcome?.kind !== 'partial') {
      throw new Error('Expected a partial outcome');
    }
    expect(outcome.assigned.map((role) => role.name)).toEqual(['Marketing']);
    expect(outcome.failed.map((failure) => failure.role.name)).toEqual(['Doctor']);
    expect(mock.state.findByEmail('nora@clinica.com')).toBeDefined();
  });

  it('fails, without trying any role and without retrying, when the user cannot be created', async () => {
    const { mock, result } = setup();
    mock.identity.unavailable();

    act(() => {
      result.current.mutate({ values: VALUES, roles: [MARKETING] });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({
      status: 503,
      code: 'identity_provider_unavailable',
    });
    expect(mock.requestsTo('POST', '/api/v1/users')).toHaveLength(1);
    expect(mock.requestsTo('POST', /\/roles$/)).toHaveLength(0);
  });

  describe('the password (research D13)', () => {
    it('is not kept by the cache: the mutation is collected as soon as nobody watches it', async () => {
      const { queryClient, result } = setup();
      act(() => {
        result.current.mutate({ values: VALUES, roles: [MARKETING] });
      });
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      // It holds the variables while it is watched, and it is not kept for five minutes afterwards.
      expect(queryClient.getMutationCache().getAll()[0]?.gcTime).toBe(0);

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
      });
    });

    it('is not kept either when the creation fails', async () => {
      const { mock, queryClient, result } = setup();
      mock.identity.rejected();
      act(() => {
        result.current.mutate({ values: VALUES, roles: [MARKETING] });
      });
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
      });
    });
  });
});
