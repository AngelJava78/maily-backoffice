import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { PriceCycleToggle } from './PriceCycleToggle';

const text = messages.subscriptions.comparison.priceToggle;

/** A host that keeps the toggle's state, as the screens that use it do. */
function Host({
  initial = 'monthly' as const,
  onChange,
}: {
  readonly initial?: 'monthly' | 'annual';
  readonly onChange?: (cycle: 'monthly' | 'annual') => void;
}) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>(initial);
  return (
    <PriceCycleToggle
      value={cycle}
      onChange={(next) => {
        setCycle(next);
        onChange?.(next);
      }}
    />
  );
}

describe('PriceCycleToggle', () => {
  it('shows Mensual and Anual, with Mensual pressed by default', () => {
    render(<Host />);

    expect(screen.getByRole('button', { name: text.monthly, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.annual, pressed: false })).toBeInTheDocument();
  });

  it('calls onChange with the chosen cycle, and reflects it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: text.annual }));

    expect(onChange).toHaveBeenCalledWith('annual');
    expect(screen.getByRole('button', { name: text.annual, pressed: true })).toBeInTheDocument();
  });

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.tab();
    expect(screen.getByRole('button', { name: text.monthly })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: text.annual })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Host />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
