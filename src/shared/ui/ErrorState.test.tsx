import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the title and the message in an alert', () => {
    render(<ErrorState title="Algo falló" message="No se pudo cargar" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Algo falló');
    expect(alert).toHaveTextContent('No se pudo cargar');
  });

  it('offers no retry button when there is nothing to retry', () => {
    render(<ErrorState title="Algo falló" message="No se pudo cargar" />);

    expect(screen.queryByRole('button', { name: messages.common.retry })).not.toBeInTheDocument();
  });

  it('calls onRetry when the retry button is pressed', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn<() => void>();
    render(<ErrorState title="Algo falló" message="No se pudo cargar" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders the secondary action next to the retry button', () => {
    render(
      <ErrorState
        title="Algo falló"
        message="No se pudo cargar"
        onRetry={() => undefined}
        secondaryAction={<button type="button">Cerrar sesión</button>}
      />,
    );

    expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ErrorState
        title="Algo falló"
        message="No se pudo cargar"
        onRetry={() => undefined}
        secondaryAction={<button type="button">Cerrar sesión</button>}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
