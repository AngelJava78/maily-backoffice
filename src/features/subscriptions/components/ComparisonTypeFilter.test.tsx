import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { SUBSCRIPTION_TYPE, type SubscriptionTypeId } from '../schemas/subscriptionTypeCatalog';
import { ComparisonTypeFilter } from './ComparisonTypeFilter';

const text = messages.subscriptions.types.catalog;

/** A host that keeps the filter's state, as the screens that use it do (research D3). */
function Host({
  initial = SUBSCRIPTION_TYPE.INDIVIDUAL,
  onChange,
}: {
  readonly initial?: SubscriptionTypeId;
  readonly onChange?: (type: SubscriptionTypeId) => void;
}) {
  const [type, setType] = useState<SubscriptionTypeId>(initial);
  return (
    <ComparisonTypeFilter
      value={type}
      onChange={(next) => {
        setType(next);
        onChange?.(next);
      }}
    />
  );
}

describe('ComparisonTypeFilter', () => {
  it('shows Individual and Empresarial, with Individual pressed by default', () => {
    render(<Host />);

    expect(screen.getByRole('button', { name: text[1].name, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text[2].name, pressed: false })).toBeInTheDocument();
  });

  it('calls onChange with the chosen type, and reflects it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: text[2].name }));

    expect(onChange).toHaveBeenCalledWith(SUBSCRIPTION_TYPE.ENTERPRISE);
    expect(screen.getByRole('button', { name: text[2].name, pressed: true })).toBeInTheDocument();
  });

  it('does not call onChange when clicking the type already chosen', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: text[1].name }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.tab();
    expect(screen.getByRole('button', { name: text[1].name })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: text[2].name })).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Host />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
