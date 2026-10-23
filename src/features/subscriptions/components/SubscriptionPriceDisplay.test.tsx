import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { SubscriptionPriceDisplay } from './SubscriptionPriceDisplay';

const text = messages.subscriptions.price;

describe('SubscriptionPriceDisplay', () => {
  it('shows the monthly price with its suffix', () => {
    render(
      <SubscriptionPriceDisplay cycle="monthly" monthlyPrice="1299.00" annualPrice="12990.00" />,
    );

    expect(screen.getByText('$1,299.00/mes')).toBeInTheDocument();
    expect(screen.queryByText(/Ahorra/)).not.toBeInTheDocument();
  });

  it('shows the annual price with its saving, when it saves', () => {
    render(
      <SubscriptionPriceDisplay cycle="annual" monthlyPrice="1299.00" annualPrice="12990.00" />,
    );

    expect(screen.getByText('$12,990.00/año')).toBeInTheDocument();
    expect(screen.getByText(text.savingsBadge(17))).toBeInTheDocument();
    expect(screen.getByText(text.savingsCaption('$1,082.50', '$2,598.00'))).toBeInTheDocument();
  });

  it('shows only the annual price, with no saving badge or caption, when it does not save', () => {
    render(
      <SubscriptionPriceDisplay cycle="annual" monthlyPrice="900.00" annualPrice="10800.00" />,
    );

    expect(screen.getByText('$10,800.00/año')).toBeInTheDocument();
    expect(screen.queryByText(/Ahorra/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Equivale a/)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SubscriptionPriceDisplay cycle="annual" monthlyPrice="1299.00" annualPrice="12990.00" />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
