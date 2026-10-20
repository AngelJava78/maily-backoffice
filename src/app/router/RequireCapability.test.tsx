import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RequireCapability } from './RequireCapability';

function renderGate(allowed: boolean) {
  return renderWithProviders(
    [
      {
        path: '/users/new',
        element: (
          <RequireCapability allowed={allowed} to="/users">
            <p>Formulario</p>
          </RequireCapability>
        ),
      },
      { path: '/users', element: <p>Listado</p> },
    ],
    { route: '/users/new' },
  );
}

describe('RequireCapability', () => {
  it('shows what it guards to someone who is allowed', () => {
    renderGate(true);

    expect(screen.getByText('Formulario')).toBeInTheDocument();
    expect(screen.queryByText(messages.forbidden.action)).not.toBeInTheDocument();
  });

  it('sends someone who is not allowed to the place it names, replacing the entry, with one notice', async () => {
    const { router } = renderGate(false);

    expect(await screen.findByText('Listado')).toBeInTheDocument();
    expect(screen.queryByText('Formulario')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/users');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findAllByText(messages.forbidden.action)).toHaveLength(1);
  });

  it('reacts when the permission is taken away while the person is inside (FR-015)', async () => {
    function Harness() {
      const [allowed, setAllowed] = useState(true);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setAllowed(false);
            }}
          >
            Quitar permiso
          </button>
          <RequireCapability allowed={allowed} to="/users">
            <p>Formulario</p>
          </RequireCapability>
        </>
      );
    }
    const { user, router } = renderWithProviders(
      [
        { path: '/users/new', element: <Harness /> },
        { path: '/users', element: <p>Listado</p> },
      ],
      { route: '/users/new' },
    );
    expect(screen.getByText('Formulario')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar permiso' }));

    expect(await screen.findByText('Listado')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/users');
    expect(await screen.findAllByText(messages.forbidden.action)).toHaveLength(1);
  });
});
