import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { ApiError } from '@/shared/api/ApiError';

import { isUserOutOfDate, refreshAfterRoleChange } from './refreshUser';
import { roleKeys, userKeys } from './userKeys';

const refusal = (status: number, code: string) =>
  ApiError.fromResponse(status, { code, message: 'Un mensaje del servicio' });

describe('isUserOutOfDate', () => {
  it.each([
    [409, 'user_blocked'],
    [409, 'user_deleted'],
    [409, 'user_not_active'],
    [409, 'user_already_active'],
    [404, 'user_not_found'],
  ])('is true for the refusal %i %s: the user is not as the screen believes', (status, code) => {
    expect(isUserOutOfDate(refusal(status, code), 'update')).toBe(true);
  });

  it.each([
    [409, 'user_role_already_associated'],
    [409, 'user_role_not_associated'],
    [404, 'role_not_found'],
    [422, 'validation_error'],
    [403, 'permission_denied'],
    [503, 'identity_provider_unavailable'],
  ])('is false for the refusal %i %s: the user is as the screen believes', (status, code) => {
    expect(isUserOutOfDate(refusal(status, code), 'assignRole')).toBe(false);
  });

  it('is false for a failure without answer, for something that is not an error and for no error', () => {
    expect(isUserOutOfDate(ApiError.network(), 'update')).toBe(false);
    expect(isUserOutOfDate(ApiError.timeout(), 'update')).toBe(false);
    expect(isUserOutOfDate(new Error('boom'), 'update')).toBe(false);
    expect(isUserOutOfDate(null, 'update')).toBe(false);
  });
});

describe('refreshAfterRoleChange', () => {
  function cached() {
    const queryClient = createQueryClient();
    const keys = {
      detail: userKeys.detail(7),
      roles: userKeys.roles(7),
      otherDetail: userKeys.detail(8),
      list: userKeys.list({ page: 1, pageSize: 10 }),
      search: userKeys.search('a@b.co'),
      catalog: roleKeys.catalog(),
    };
    for (const key of Object.values(keys)) {
      queryClient.setQueryData(key, 'cached');
    }
    const stale = (key: keyof typeof keys) => queryClient.getQueryState(keys[key])?.isInvalidated;
    return { queryClient, stale };
  }

  it('only marks the roles of the user as stale when the change worked', async () => {
    const { queryClient, stale } = cached();

    await refreshAfterRoleChange(queryClient, 7, null, 'assignRole');

    expect(stale('roles')).toBe(true);
    expect(stale('detail')).toBe(false);
    expect(stale('list')).toBe(false);
    expect(stale('catalog')).toBe(false);
  });

  it('also marks the catalog as stale when the role is gone, so it is not offered again', async () => {
    const { queryClient, stale } = cached();

    await refreshAfterRoleChange(queryClient, 7, refusal(404, 'role_not_found'), 'assignRole');

    expect(stale('catalog')).toBe(true);
    // The roles of the user may have lost that role too.
    expect(stale('roles')).toBe(true);
    expect(stale('detail')).toBe(false);
  });

  it('only marks the roles as stale when the change was already done', async () => {
    const { queryClient, stale } = cached();

    await refreshAfterRoleChange(
      queryClient,
      7,
      refusal(409, 'user_role_already_associated'),
      'assignRole',
    );

    expect(stale('roles')).toBe(true);
    expect(stale('detail')).toBe(false);
    expect(stale('catalog')).toBe(false);
  });

  it('marks the user, the lists and the searches as stale, but not its roles, when the user changed', async () => {
    const { queryClient, stale } = cached();

    await refreshAfterRoleChange(queryClient, 7, refusal(409, 'user_blocked'), 'unassignRole');

    expect(stale('detail')).toBe(true);
    expect(stale('list')).toBe(true);
    expect(stale('search')).toBe(true);
    // The roles of a user that cannot have them would only be asked to be refused.
    expect(stale('roles')).toBe(false);
    expect(stale('otherDetail')).toBe(false);
  });
});
