import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { auth0User } from '@/test/auth0Double';
import { operatorAccess } from '@/test/factories';
import { createWrapper } from '@/test/renderWithProviders';
import { platformUserSchema } from '@/features/users';
import { userDto } from '@/test/factories';
import { uuidOf } from '@/test/ids';

import { useOperatorIdentity } from './useOperatorIdentity';

function accessFor(overrides: Parameters<typeof userDto>[0] = {}) {
  return operatorAccess({
    user: platformUserSchema.parse(userDto(overrides)),
    roles: [
      { id: 4, name: 'Marketing', type: { id: 1, name: 'Sistema' }, permissions: ['tenants:read'] },
      { id: 5, name: 'Owner', type: { id: 2, name: 'Clínica' }, permissions: [] },
    ],
  });
}

describe('useOperatorIdentity', () => {
  it('describes the operator with the data of the platform user (clarifications 11 and 12)', () => {
    const { wrapper } = createWrapper({
      access: accessFor({
        first_name: 'María José',
        paternal_last_name: 'García',
        maternal_last_name: 'López',
        email: 'maria@clinica.com',
      }),
    });

    const { result } = renderHook(() => useOperatorIdentity(), { wrapper });

    expect(result.current).toEqual({
      id: uuidOf(121),
      displayName: 'María José García',
      firstName: 'María José',
      paternalLastName: 'García',
      maternalLastName: 'López',
      email: 'maria@clinica.com',
      roles: [
        {
          id: 4,
          name: 'Marketing',
          type: { id: 1, name: 'Sistema' },
          permissions: ['tenants:read'],
        },
        { id: 5, name: 'Owner', type: { id: 2, name: 'Clínica' }, permissions: [] },
      ],
    });
  });

  it('keeps the maternal last name empty when the user has none', () => {
    const { wrapper } = createWrapper({ access: accessFor({ maternal_last_name: null }) });

    const { result } = renderHook(() => useOperatorIdentity(), { wrapper });

    expect(result.current.maternalLastName).toBeNull();
  });

  it("carries the platform user's own id, for Avatar's deterministic tone (011-profile-avatar-menu)", () => {
    const { wrapper } = createWrapper({ access: accessFor({ id: uuidOf(7) }) });

    const { result } = renderHook(() => useOperatorIdentity(), { wrapper });

    expect(result.current.id).toBe(uuidOf(7));
  });

  it('ignores the name, e-mail and picture of the Auth0 account', () => {
    const { wrapper } = createWrapper({
      auth0: {
        isAuthenticated: true,
        user: auth0User({
          name: 'Otro Nombre',
          email: 'otra@cuenta.com',
          picture: 'https://cdn.example.com/otra.png',
        }),
      },
      access: accessFor({
        first_name: 'Ana',
        paternal_last_name: 'Pérez',
        email: 'ana@clinica.com',
      }),
    });

    const { result } = renderHook(() => useOperatorIdentity(), { wrapper });

    expect(result.current.displayName).toBe('Ana Pérez');
    expect(result.current.email).toBe('ana@clinica.com');
    expect(JSON.stringify(result.current)).not.toContain('Otro Nombre');
    expect(JSON.stringify(result.current)).not.toContain('cdn.example.com');
  });

  it('follows the access when it changes', async () => {
    const harness = createWrapper({ access: accessFor({ first_name: 'Ana' }) });
    const { result } = renderHook(() => useOperatorIdentity(), { wrapper: harness.wrapper });
    expect(result.current.firstName).toBe('Ana');

    await harness.updateAccess(accessFor({ first_name: 'Beatriz' }));

    expect(result.current.firstName).toBe('Beatriz');
  });
});
