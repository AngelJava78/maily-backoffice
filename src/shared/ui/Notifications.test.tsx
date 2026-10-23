import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { ThemeModeProvider } from '@/app/providers/ThemeModeProvider';

import { NotificationsProvider, useNotify } from './Notifications';

function Trigger({ message }: { readonly message: string }) {
  const notify = useNotify();
  return (
    <button
      type="button"
      onClick={() => {
        notify({ severity: 'success', message });
      }}
    >
      Notify
    </button>
  );
}

function renderWithNotifications(ui: ReactElement) {
  return render(
    <ThemeModeProvider>
      <NotificationsProvider>{ui}</NotificationsProvider>
    </ThemeModeProvider>,
  );
}

describe('NotificationsProvider and useNotify', () => {
  it('shows the notification with its severity', async () => {
    const user = userEvent.setup();
    renderWithNotifications(<Trigger message="Guardado" />);

    await user.click(screen.getByRole('button', { name: 'Notify' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Guardado');
    expect(alert).toHaveClass('MuiAlert-colorSuccess');
  });

  it('closes the notification with its close button', async () => {
    const user = userEvent.setup();
    renderWithNotifications(<Trigger message="Guardado" />);
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    const alert = await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitForElementToBeRemoved(alert);
  });

  it('replaces the notification when a new one arrives', async () => {
    const user = userEvent.setup();
    function Two() {
      const notify = useNotify();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              notify({ severity: 'info', message: 'Primero' });
            }}
          >
            First
          </button>
          <button
            type="button"
            onClick={() => {
              notify({ severity: 'error', message: 'Segundo' });
            }}
          >
            Second
          </button>
        </>
      );
    }
    renderWithNotifications(<Two />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    expect(await screen.findByText('Primero')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Second' }));

    expect(await screen.findByText('Segundo')).toBeInTheDocument();
    expect(screen.queryByText('Primero')).not.toBeInTheDocument();
  });

  it('returns a notify function whose identity does not change between renders', async () => {
    const user = userEvent.setup();
    const seen = new Set<unknown>();
    function Probe() {
      const notify = useNotify();
      const [renders, setRenders] = useState(0);
      seen.add(notify);
      return (
        <button
          type="button"
          onClick={() => {
            setRenders(renders + 1);
          }}
        >
          Render {renders}
        </button>
      );
    }
    renderWithNotifications(<Probe />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));

    expect(seen.size).toBe(1);
  });

  it('fails with a clear error when there is no provider', () => {
    // React reports the error that nobody catches through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Orphan() {
      useNotify();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(/NotificationsProvider/);
  });

  it('has no accessibility violations while a notification is shown', async () => {
    const user = userEvent.setup();
    const { container } = renderWithNotifications(<Trigger message="Guardado" />);
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    await screen.findByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
