import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions.status;

describe('SubscriptionStatusChip', () => {
  it.each([
    [1, 'Activa', text.active, 'MuiChip-colorSuccess'],
    [2, 'Inactiva', text.inactive, 'MuiChip-colorDefault'],
    [3, 'Bloqueada', text.blocked, 'MuiChip-colorWarning'],
  ])('shows the text of the status %i, with its colour', (id, name, label, colour) => {
    render(<SubscriptionStatusChip status={{ id, name }} />);

    const chip = screen.getByText(label).closest('.MuiChip-root');
    expect(chip).toHaveClass(colour);
    expect(chip).toHaveClass('MuiChip-filled');
  });

  it('decides by the id, never by the name the API gives it', () => {
    render(<SubscriptionStatusChip status={{ id: 2, name: 'Suspendida' }} />);

    expect(screen.getByText(text.inactive)).toBeInTheDocument();
    expect(screen.queryByText('Suspendida')).not.toBeInTheDocument();
  });

  it('shows the name of the API, with an outline, for a status it does not know', () => {
    render(<SubscriptionStatusChip status={{ id: 5, name: 'En revisión' }} />);

    const chip = screen.getByText('En revisión').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-outlined');
    expect(chip).toHaveClass('MuiChip-colorDefault');
  });

  it('never depends on the colour alone: the status is always a text', () => {
    render(
      <>
        <SubscriptionStatusChip status={{ id: 1, name: 'Activa' }} />
        <SubscriptionStatusChip status={{ id: 2, name: 'Inactiva' }} />
        <SubscriptionStatusChip status={{ id: 3, name: 'Bloqueada' }} />
      </>,
    );

    for (const label of Object.values(text)) {
      expect(screen.getByText(label).textContent).not.toBe('');
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <SubscriptionStatusChip status={{ id: 1, name: 'Activa' }} />
        <SubscriptionStatusChip status={{ id: 2, name: 'Inactiva' }} />
        <SubscriptionStatusChip status={{ id: 3, name: 'Bloqueada' }} />
        <SubscriptionStatusChip status={{ id: 5, name: 'En revisión' }} />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
