import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  it.each([
    [1, 'Activo', messages.users.status.active],
    [2, 'Bloqueado', messages.users.status.blocked],
    [3, 'Eliminado', messages.users.status.deleted],
  ])('shows the text of the status %i', (id, name, text) => {
    render(<StatusChip status={{ id, name }} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('decides by the id, never by the name the service gives it', () => {
    render(<StatusChip status={{ id: 2, name: 'Suspendido' }} />);

    expect(screen.getByText(messages.users.status.blocked)).toBeInTheDocument();
    expect(screen.queryByText('Suspendido')).not.toBeInTheDocument();
  });

  it('shows the name of the catalog for a status it does not know', () => {
    render(<StatusChip status={{ id: 9, name: 'En revisión' }} />);

    expect(screen.getByText('En revisión')).toBeInTheDocument();
  });

  it('never depends on the colour alone: the status is always a text', () => {
    render(
      <>
        <StatusChip status={{ id: 1, name: 'Activo' }} />
        <StatusChip status={{ id: 2, name: 'Bloqueado' }} />
        <StatusChip status={{ id: 3, name: 'Eliminado' }} />
      </>,
    );

    for (const text of Object.values(messages.users.status)) {
      expect(screen.getByText(text).textContent).not.toBe('');
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <StatusChip status={{ id: 1, name: 'Activo' }} />
        <StatusChip status={{ id: 2, name: 'Bloqueado' }} />
        <StatusChip status={{ id: 3, name: 'Eliminado' }} />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
