import { describe, expect, it } from 'vitest';

import type { PlatformUser } from '@/features/users';

import type { AccessRole, MyAccess } from '../schemas/myAccess';
import { evaluateAccess } from './evaluateAccess';
import { uuidOf } from '@/test/ids';

function makeUser(overrides: Partial<PlatformUser> = {}): PlatformUser {
  return {
    id: uuidOf(121),
    auth0Id: 'auth0|abc123',
    email: 'ana@clinica.com',
    firstName: 'Ana',
    paternalLastName: 'Pérez',
    maternalLastName: null,
    status: { id: 1, name: 'Activo' },
    createdAt: '2026-10-15T14:20:11.032Z',
    updatedAt: '2026-10-15T14:20:11.032Z',
    ...overrides,
  };
}

function makeRole(id: number, name: string, permissions: string[] = []): AccessRole {
  return { id, name, permissions };
}

function makeAccess(overrides: Partial<MyAccess> = {}): MyAccess {
  return { user: makeUser(), roles: [], ...overrides };
}

describe('evaluateAccess', () => {
  describe('denial', () => {
    it('denies a person who is not registered', () => {
      expect(evaluateAccess({ user: null, roles: [] })).toEqual({
        kind: 'denied',
        reason: 'not_registered',
      });
    });

    it.each([
      [2, 'Bloqueado'],
      [3, 'Eliminado'],
      [99, 'Otro'],
    ])('denies an account with status %i even when roles arrive', (id, name) => {
      const decision = evaluateAccess(
        makeAccess({
          user: makeUser({ status: { id, name } }),
          roles: [makeRole(1, 'Administrator', ['users:read'])],
        }),
      );

      expect(decision).toEqual({ kind: 'denied', reason: 'inactive_account' });
    });

    it('denies an active user without roles', () => {
      expect(evaluateAccess(makeAccess({ roles: [] }))).toEqual({
        kind: 'denied',
        reason: 'no_authorized_role',
      });
    });

    it('denies an active user whose roles do not give access to the backoffice', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(5, 'Owner', ['clinics:read']), makeRole(6, 'Doctor')] }),
      );

      expect(decision).toEqual({ kind: 'denied', reason: 'no_authorized_role' });
    });

    it('checks the registration first, then the status, then the roles', () => {
      expect(evaluateAccess({ user: null, roles: [makeRole(1, 'Administrator')] })).toMatchObject({
        reason: 'not_registered',
      });
      expect(
        evaluateAccess(makeAccess({ user: makeUser({ status: { id: 2, name: 'Bloqueado' } }) })),
      ).toMatchObject({ reason: 'inactive_account' });
    });
  });

  describe('grant', () => {
    it('grants access to an active user with an authorized role', () => {
      const user = makeUser();
      const marketing = makeRole(4, 'Marketing', ['tenants:read']);

      const decision = evaluateAccess({ user, roles: [marketing] });

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.user).toBe(user);
        expect(decision.access.roles).toEqual([marketing]);
        expect(decision.access.authorizedRoles).toEqual([marketing]);
        expect([...decision.access.permissions]).toEqual(['tenants:read']);
      }
    });

    it('counts only the permissions of the authorized roles', () => {
      const marketing = makeRole(4, 'Marketing', ['tenants:read']);
      const owner = makeRole(5, 'Owner', ['clinics:read', 'clinics:write', 'users:read']);

      const decision = evaluateAccess(makeAccess({ roles: [marketing, owner] }));

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.roles).toEqual([marketing, owner]);
        expect(decision.access.authorizedRoles).toEqual([marketing]);
        expect([...decision.access.permissions]).toEqual(['tenants:read']);
      }
    });

    it('merges the permissions of several authorized roles without duplicates', () => {
      const decision = evaluateAccess(
        makeAccess({
          roles: [
            makeRole(1, 'Administrator', ['users:read', 'users:write']),
            makeRole(2, 'Billing', ['users:read', 'subscriptions:read']),
          ],
        }),
      );

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.size).toBe(3);
        expect(decision.access.permissions).toEqual(
          new Set(['users:read', 'users:write', 'subscriptions:read']),
        );
      }
    });

    it('grants access with an empty set of permissions when the role has none yet', () => {
      const decision = evaluateAccess(makeAccess({ roles: [makeRole(3, 'Developer')] }));

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.size).toBe(0);
      }
    });

    it('recognizes the role names ignoring case and spaces', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(4, ' marketing ', ['tenants:read'])] }),
      );

      expect(decision.kind).toBe('granted');
    });
  });

  // Only the roles that give access decide whether the Panel shows its indicators (feature 007).
  describe('the permission of the Panel (FR-013 of feature 007)', () => {
    it('does not count dashboard:read when only a role without access to the backoffice has it', () => {
      const decision = evaluateAccess(
        makeAccess({
          roles: [
            makeRole(4, 'Marketing', ['tenants:read']),
            makeRole(5, 'Owner', ['dashboard:read']),
          ],
        }),
      );

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.has('dashboard:read')).toBe(false);
      }
    });

    it('counts dashboard:read when a role that gives access has it', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(1, 'Administrator', ['dashboard:read'])] }),
      );

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.has('dashboard:read')).toBe(true);
      }
    });
  });
});
