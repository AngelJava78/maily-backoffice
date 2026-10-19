import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { ADMIN_AUTH0, ADMIN_SUB } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { accessKeys } from './accessKeys';
import { useRefreshOperatorAccess } from './useRefreshOperatorAccess';

describe('useRefreshOperatorAccess', () => {
  it('marks the access of the operator as stale, so it is asked for again at once', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(accessKeys.operator(ADMIN_SUB), 'what was known');
    queryClient.setQueryData(accessKeys.operator('auth0|otra-persona'), 'what another one had');
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0, queryClient });
    const { result } = renderHook(() => useRefreshOperatorAccess(), { wrapper });

    result.current();

    expect(queryClient.getQueryState(accessKeys.operator(ADMIN_SUB))?.isInvalidated).toBe(true);
    // Only the access of the person who is inside.
    expect(
      queryClient.getQueryState(accessKeys.operator('auth0|otra-persona'))?.isInvalidated,
    ).toBe(false);
  });

  it('does nothing harmful when nobody has signed in', () => {
    const queryClient = createQueryClient();
    const { wrapper } = createWrapper({ queryClient });
    const { result } = renderHook(() => useRefreshOperatorAccess(), { wrapper });

    expect(() => {
      result.current();
    }).not.toThrow();
  });
});
