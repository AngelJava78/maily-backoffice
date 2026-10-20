import { act, render, renderHook, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { NotificationsProvider } from './Notifications';
import { useDeferredNotice } from './useDeferredNotice';

function wrapper({ children }: { readonly children: ReactNode }) {
  return <NotificationsProvider>{children}</NotificationsProvider>;
}

describe('useDeferredNotice', () => {
  it('shows nothing until the dialog has closed, and then what was kept', async () => {
    const { result } = renderHook(() => useDeferredNotice(), { wrapper });

    act(() => {
      result.current.defer({ severity: 'success', message: 'Usuario bloqueado.' });
    });
    expect(screen.queryByText('Usuario bloqueado.')).not.toBeInTheDocument();

    act(() => {
      result.current.flush();
    });
    expect(await screen.findByText('Usuario bloqueado.')).toBeInTheDocument();
  });

  it('shows only the last of the notifications that were kept, and each one once', async () => {
    const { result } = renderHook(() => useDeferredNotice(), { wrapper });

    act(() => {
      result.current.defer({ severity: 'info', message: 'Primero' });
      result.current.defer({ severity: 'error', message: 'Segundo' });
      result.current.flush();
      result.current.flush();
    });

    expect(await screen.findByText('Segundo')).toBeInTheDocument();
    expect(screen.queryByText('Primero')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('does nothing when the dialog closes and there is nothing to say', () => {
    const { result } = renderHook(() => useDeferredNotice(), { wrapper });

    act(() => {
      result.current.flush();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('tells what it kept when the component that kept it goes away, as with a dialog that is gone', async () => {
    function Owner() {
      const { defer } = useDeferredNotice();
      useEffect(() => {
        defer({ severity: 'warning', message: 'La suscripción ya no existe.' });
      }, [defer]);
      return <p>Con diálogo</p>;
    }
    const { rerender } = render(
      <NotificationsProvider>
        <Owner />
      </NotificationsProvider>,
    );
    expect(screen.queryByText('La suscripción ya no existe.')).not.toBeInTheDocument();

    rerender(<NotificationsProvider>{null}</NotificationsProvider>);

    expect(await screen.findByText('La suscripción ya no existe.')).toBeInTheDocument();
  });
});
