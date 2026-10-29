import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ADMIN_AUTH0 } from '@/test/handlers/usersDirectory';
import { createClinicModulesCatalogMock } from '@/test/handlers/subscriptionModulesCatalog';
import { createWrapper } from '@/test/renderWithProviders';

import { useClinicModulesCatalog } from './useClinicModulesCatalog';

describe('useClinicModulesCatalog', () => {
  it('gives the active clinic modules, in camelCase', async () => {
    createClinicModulesCatalogMock([
      { key: 'patients', name: 'Pacientes', description: null, sort_order: 10 },
      { key: 'scheduling', name: 'Agenda y citas', description: 'Calendario.', sort_order: 20 },
    ]);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useClinicModulesCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data).toEqual([
      { key: 'patients', name: 'Pacientes', description: null, sortOrder: 10 },
      { key: 'scheduling', name: 'Agenda y citas', description: 'Calendario.', sortOrder: 20 },
    ]);
  });

  it('keeps a failed request as the error of the query', async () => {
    const mock = createClinicModulesCatalogMock();
    mock.failWith(500);
    const { wrapper } = createWrapper({ auth0: ADMIN_AUTH0 });

    const { result } = renderHook(() => useClinicModulesCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
