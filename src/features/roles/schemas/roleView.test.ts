import { describe, expect, it } from 'vitest';

import type { Role } from './role';
import { resolveRoleView, type RoleListState } from './roleView';

function role(id: number, statusId: 1 | 2 = 1): Role {
  return {
    id,
    name: `Role ${id}`,
    description: null,
    createdAt: '2026-10-15T05:57:30.521Z',
    status: { id: statusId, name: statusId === 1 ? 'Activo' : 'Bloqueado' },
    type: { id: 1, name: 'Sistema' },
  };
}

const success = (...roles: readonly Role[]): RoleListState => ({ status: 'success', roles });
const PENDING: RoleListState = { status: 'pending' };
const FAILED: RoleListState = { status: 'error' };

describe('resolveRoleView (research D5)', () => {
  it('waits while the list of the active roles is loading', () => {
    expect(
      resolveRoleView({ roleId: 1, active: PENDING, blocked: undefined, shownAsActive: false }),
    ).toEqual({ kind: 'loading' });
  });

  it('is an error when the list of the active roles failed', () => {
    expect(
      resolveRoleView({ roleId: 1, active: FAILED, blocked: undefined, shownAsActive: false }),
    ).toEqual({ kind: 'error' });
  });

  it('opens the role that is among the active ones, without needing the blocked list', () => {
    const wanted = role(2);

    expect(
      resolveRoleView({
        roleId: 2,
        active: success(role(1), wanted),
        blocked: undefined,
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'active', role: wanted });
  });

  it('prefers the active role even if a blocked list that is known also has an id like it', () => {
    const wanted = role(2);

    expect(
      resolveRoleView({
        roleId: 2,
        active: success(wanted),
        blocked: success(role(2, 2)),
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'active', role: wanted });
  });

  it('says «no longer exists» for a role that was shown as active and is not among them now (FR-014)', () => {
    expect(
      resolveRoleView({
        roleId: 5,
        active: success(role(1)),
        // Someone blocked it from another session: it is in the blocked list now, and still «not found».
        blocked: success(role(5, 2)),
        shownAsActive: true,
      }),
    ).toEqual({ kind: 'notFound' });
  });

  it('waits for the blocked list when the role is not active and it was not asked for yet', () => {
    expect(
      resolveRoleView({
        roleId: 5,
        active: success(role(1)),
        blocked: undefined,
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('waits while the blocked list is loading', () => {
    expect(
      resolveRoleView({
        roleId: 5,
        active: success(role(1)),
        blocked: PENDING,
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('is an error when the blocked list failed', () => {
    expect(
      resolveRoleView({
        roleId: 5,
        active: success(role(1)),
        blocked: FAILED,
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'error' });
  });

  it('opens a blocked role in its own view, with the role of the blocked list', () => {
    const blocked = role(5, 2);

    expect(
      resolveRoleView({
        roleId: 5,
        active: success(role(1)),
        blocked: success(role(3, 2), blocked),
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'blocked', role: blocked });
  });

  it('says «no longer exists» for a role that is in neither list', () => {
    expect(
      resolveRoleView({
        roleId: 99,
        active: success(role(1)),
        blocked: success(role(3, 2)),
        shownAsActive: false,
      }),
    ).toEqual({ kind: 'notFound' });
  });
});
