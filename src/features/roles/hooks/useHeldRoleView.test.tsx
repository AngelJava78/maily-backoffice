import { useMutation } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createWrapper } from '@/test/renderWithProviders';

import type { Role } from '../schemas/role';
import type { RoleView } from '../schemas/roleView';
import { useHeldRoleView } from './useHeldRoleView';

const role: Role = {
  id: 3,
  name: 'Support',
  description: null,
  createdAt: '2026-10-15T05:57:30.521Z',
  status: { id: 2, name: 'Bloqueado' },
  type: { id: 1, name: 'Sistema' },
};
const blocked: RoleView = { kind: 'blocked', role };
const active: RoleView = { kind: 'active', role };
const gone: RoleView = { kind: 'notFound' };

function setup(initial: RoleView) {
  const { wrapper } = createWrapper();
  let finish: () => void = () => undefined;
  const { result, rerender } = renderHook(
    ({ roleId, view }: { roleId: number; view: RoleView }) => {
      const mutation = useMutation({
        mutationFn: () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      });
      return { held: useHeldRoleView(roleId, view), mutation };
    },
    { wrapper, initialProps: { roleId: 3, view: initial } },
  );
  return {
    result,
    rerender,
    finish: () => {
      finish();
    },
  };
}

describe('useHeldRoleView', () => {
  it('follows the view while nothing is being changed', () => {
    const { result, rerender } = setup(blocked);
    expect(result.current.held).toBe(blocked);

    rerender({ roleId: 3, view: active });

    expect(result.current.held).toBe(active);
  });

  it('keeps the view it had while something is being changed, and follows the lists again afterwards', async () => {
    const { result, rerender, finish } = setup(blocked);

    act(() => {
      result.current.mutation.mutate();
    });
    await waitFor(() => {
      expect(result.current.mutation.isPending).toBe(true);
    });
    rerender({ roleId: 3, view: gone });
    expect(result.current.held).toBe(blocked);
    rerender({ roleId: 3, view: active });
    expect(result.current.held).toBe(blocked);

    act(() => {
      finish();
    });

    await waitFor(() => {
      expect(result.current.held).toBe(active);
    });
  });

  it('does not hold the view of another role', async () => {
    const { result, rerender } = setup(blocked);
    act(() => {
      result.current.mutation.mutate();
    });
    await waitFor(() => {
      expect(result.current.mutation.isPending).toBe(true);
    });

    rerender({ roleId: 4, view: gone });

    expect(result.current.held).toBe(gone);
  });
});
