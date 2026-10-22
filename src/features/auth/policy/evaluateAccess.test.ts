import { describe, expect, it } from 'vitest';

import type { PlatformUser } from '@/features/users';

import type { AccessRole, MyAccess } from '../schemas/myAccess';
import { evaluateAccess } from './evaluateAccess';
import { ROLE_TYPE } from './roleTypes';
import { uuidOf } from '@/test/ids';

const SYSTEM_TYPE = { id: ROLE_TYPE.SYSTEM, name: 'Sistema' };
const CLINIC_TYPE = { id: ROLE_TYPE.CLINIC, name: 'Clínica' };

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

function makeRole(
  id: number,
  name: string,
  type: AccessRole['type'] = SYSTEM_TYPE,
  permissions: string[] = [],
): AccessRole {
  return { id, name, type, permissions };
}

function makeAccess(overrides: Partial<MyAccess> = {}): MyAccess {
  return { user: makeUser(), roles: [], ...overrides };
}

describe('evaluateAccess', () => {
  describe('denial, a single outcome whatever the reason (FR-003)', () => {
    it('denies a person who is not registered', () => {
      expect(evaluateAccess({ user: null, roles: [] })).toEqual({
        kind: 'denied',
        userEmail: null,
      });
    });

    it.each([
      [2, 'Bloqueado'],
      [3, 'Eliminado'],
      [99, 'Otro'],
    ])('denies an account with status %i even when it has a role of type Sistema', (id, name) => {
      const decision = evaluateAccess(
        makeAccess({
          user: makeUser({ status: { id, name } }),
          roles: [makeRole(1, 'Administrator', SYSTEM_TYPE, ['users:read'])],
        }),
      );

      expect(decision).toEqual({ kind: 'denied', userEmail: 'ana@clinica.com' });
    });

    it('denies an active user without roles', () => {
      expect(evaluateAccess(makeAccess({ roles: [] }))).toEqual({
        kind: 'denied',
        userEmail: 'ana@clinica.com',
      });
    });

    it('denies an active user whose roles are all of type Clínica', () => {
      const decision = evaluateAccess(
        makeAccess({
          roles: [
            makeRole(5, 'Owner', CLINIC_TYPE, ['clinics:read']),
            makeRole(6, 'Doctor', CLINIC_TYPE),
          ],
        }),
      );

      expect(decision).toEqual({ kind: 'denied', userEmail: 'ana@clinica.com' });
    });

    it('denies an active user whose only role has an unknown type', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(7, 'Future', { id: 99, name: 'Futuro' })] }),
      );

      expect(decision).toEqual({ kind: 'denied', userEmail: 'ana@clinica.com' });
    });

    it('checks the registration first, then the status, then the roles', () => {
      expect(evaluateAccess({ user: null, roles: [makeRole(1, 'Administrator')] })).toMatchObject({
        kind: 'denied',
        userEmail: null,
      });
      expect(
        evaluateAccess(makeAccess({ user: makeUser({ status: { id: 2, name: 'Bloqueado' } }) })),
      ).toMatchObject({ kind: 'denied' });
    });

    // FR-014: the "Iniciaste sesión como" line of "Sin acceso" prefers the MailySoft user's own
    // e-mail; only when there is no user at all does the screen fall back to the Auth0 account
    // (useOperatorAccess.ts, outside this pure function).
    it('carries the e-mail of the MailySoft user when there is one, for FR-014', () => {
      const decision = evaluateAccess(
        makeAccess({ user: makeUser({ email: 'solo-clinica@mailysoft.test' }), roles: [] }),
      );

      expect(decision).toEqual({ kind: 'denied', userEmail: 'solo-clinica@mailysoft.test' });
    });

    it('carries no e-mail when there is no MailySoft user at all', () => {
      expect(evaluateAccess({ user: null, roles: [] })).toEqual({
        kind: 'denied',
        userEmail: null,
      });
    });
  });

  describe('grant, decided only by type.id (FR-002)', () => {
    it('grants access to an active user with a role of type Sistema', () => {
      const user = makeUser();
      const marketing = makeRole(4, 'Marketing', SYSTEM_TYPE, ['tenants:read']);

      const decision = evaluateAccess({ user, roles: [marketing] });

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.user).toBe(user);
        expect(decision.access.roles).toEqual([marketing]);
        expect(decision.access.authorizedRoles).toEqual([marketing]);
        expect([...decision.access.permissions]).toEqual(['tenants:read']);
      }
    });

    it('grants access with a role name outside the old fixed list of feature 001 (US1-3)', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(7, 'Support', SYSTEM_TYPE, ['token:read'])] }),
      );

      expect(decision.kind).toBe('granted');
    });

    it('decides by type.id even when the names of the role or of the type are swapped (US1-5)', () => {
      // type.id 1 (Sistema) named "System": still grants access, the name never decides.
      const systemTypeNamedSystem = evaluateAccess(
        makeAccess({ roles: [makeRole(4, 'Marketing', { id: 1, name: 'System' })] }),
      );
      // type.id 2 (Clínica) named "Sistema": still denies, the name never decides either.
      const clinicTypeNamedSistema = evaluateAccess(
        makeAccess({ roles: [makeRole(5, 'Owner', { id: 2, name: 'Sistema' })] }),
      );

      expect(systemTypeNamedSystem.kind).toBe('granted');
      expect(clinicTypeNamedSistema.kind).toBe('denied');
    });

    it('counts only the roles of type Sistema when the person also has roles of type Clínica (US1-2)', () => {
      const marketing = makeRole(4, 'Marketing', SYSTEM_TYPE, ['tenants:read']);
      const owner = makeRole(5, 'Owner', CLINIC_TYPE, ['clinics:read', 'clinics:write']);

      const decision = evaluateAccess(makeAccess({ roles: [marketing, owner] }));

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.roles).toEqual([marketing, owner]);
        expect(decision.access.authorizedRoles).toEqual([marketing]);
        expect([...decision.access.permissions]).toEqual(['tenants:read']);
      }
    });

    it('merges the permissions of several roles of type Sistema without duplicates', () => {
      const decision = evaluateAccess(
        makeAccess({
          roles: [
            makeRole(1, 'Administrator', SYSTEM_TYPE, ['users:read', 'users:write']),
            makeRole(2, 'Billing', SYSTEM_TYPE, ['users:read', 'subscriptions:read']),
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
  });

  // Only the roles of type Sistema decide whether the Panel shows its indicators (feature 007).
  describe('the permission of the Panel (FR-013 of feature 007)', () => {
    it('does not count dashboard:read when only a role of type Clínica has it', () => {
      const decision = evaluateAccess(
        makeAccess({
          roles: [
            makeRole(4, 'Marketing', SYSTEM_TYPE, ['tenants:read']),
            makeRole(5, 'Owner', CLINIC_TYPE, ['dashboard:read']),
          ],
        }),
      );

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.has('dashboard:read')).toBe(false);
      }
    });

    it('counts dashboard:read when a role of type Sistema has it', () => {
      const decision = evaluateAccess(
        makeAccess({ roles: [makeRole(1, 'Administrator', SYSTEM_TYPE, ['dashboard:read'])] }),
      );

      expect(decision.kind).toBe('granted');
      if (decision.kind === 'granted') {
        expect(decision.access.permissions.has('dashboard:read')).toBe(true);
      }
    });
  });
});
