import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionSchema } from '../schemas/subscription';
import { SubscriptionDetailFields } from './SubscriptionDetailFields';

const text = messages.subscriptions.detail;

function renderFields(overrides: Parameters<typeof subscriptionDto>[0] = {}) {
  return renderWithProviders(
    <SubscriptionDetailFields
      subscription={subscriptionSchema.parse(
        subscriptionDto({
          features: ['Hasta 5 consultorios', 'Usuarios ilimitados', 'Agenda'],
          clinics_count: 3,
          created_at: '2026-10-17T15:00:00Z',
          updated_at: '2026-10-18T09:30:00Z',
          ...overrides,
        }),
      )}
    />,
  );
}

/** The value next to a label of the list of definitions. */
function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== 'DD') {
    throw new Error(`There is no value for ${label}`);
  }
  return value;
}

describe('SubscriptionDetailFields', () => {
  it('shows every datum of the subscription as a list of definitions', () => {
    renderFields();

    expect(valueOf(text.fields.name)).toHaveTextContent('Pro');
    expect(valueOf(text.fields.description)).toHaveTextContent('Para clínicas en crecimiento.');
    expect(valueOf(text.fields.monthlyPrice)).toHaveTextContent('$4,500.00/mes');
    expect(
      within(valueOf(text.fields.status)).getByText(messages.subscriptions.status.active),
    ).toBeInTheDocument();
    expect(valueOf(text.fields.clinics)).toHaveTextContent('3');
    expect(valueOf(text.fields.createdAt)).toHaveTextContent(
      formatDateTime('2026-10-17T15:00:00Z'),
    );
    expect(valueOf(text.fields.updatedAt)).toHaveTextContent(
      formatDateTime('2026-10-18T09:30:00Z'),
    );
  });

  it('shows what it includes as a list, in the order received', () => {
    renderFields();

    const list = within(valueOf(text.fields.features)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Hasta 5 consultorios', 'Usuarios ilimitados', 'Agenda']);
  });

  it('says that it includes nothing when the list is empty', () => {
    renderFields({ features: [] });

    expect(valueOf(text.fields.features)).toHaveTextContent(text.noFeatures);
    expect(within(valueOf(text.fields.features)).queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a dash for a subscription without description', () => {
    renderFields({ description: null });

    expect(valueOf(text.fields.description)).toHaveTextContent(text.emptyValue);
  });

  it('keeps the line breaks of the description', () => {
    renderFields({ description: 'Primera línea.\nSegunda línea.' });

    expect(getComputedStyle(valueOf(text.fields.description)).whiteSpace).toBe('pre-line');
  });

  it('shows «No disponible», never 0, when the clinics are not known', () => {
    renderFields({ clinics_count: null });

    expect(valueOf(text.fields.clinics)).toHaveTextContent(
      messages.subscriptions.clinics.notAvailable,
    );
  });

  it('shows a price of 0 as such', () => {
    renderFields({ monthly_price: '0.00' });

    expect(valueOf(text.fields.monthlyPrice)).toHaveTextContent('$0.00/mes');
  });

  it('wraps a long name instead of overflowing', () => {
    renderFields({ name: 'Plan'.repeat(25) });

    expect(getComputedStyle(valueOf(text.fields.name)).overflowWrap).toBe('anywhere');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFields();

    expect(await axe(container)).toHaveNoViolations();
  });
});
