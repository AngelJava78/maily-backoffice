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
const modules = messages.subscriptions.modules;

function renderFields(overrides: Parameters<typeof subscriptionDto>[0] = {}) {
  return renderWithProviders(
    <SubscriptionDetailFields
      subscription={subscriptionSchema.parse(
        subscriptionDto({
          other_features: ['Hasta 5 consultorios', 'Usuarios ilimitados', 'Agenda'],
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

  it('shows the annual price with its saving', () => {
    renderFields({ monthly_price: '1299.00', annual_price: '12990.00' });

    const value = valueOf(text.fields.annualPrice);
    expect(value).toHaveTextContent('$12,990.00/año');
    expect(value).toHaveTextContent(messages.subscriptions.price.savingsBadge(17));
  });

  it('shows no saving badge or caption when the annual price does not save', () => {
    renderFields({ monthly_price: '900.00', annual_price: '10800.00' });

    expect(valueOf(text.fields.annualPrice)).not.toHaveTextContent('Ahorra');
  });

  it('shows the trial days when there are any, and nothing when there are none', () => {
    renderFields({ trial_days: 14 });
    expect(screen.getByText(messages.subscriptions.price.trialDays(14))).toBeInTheDocument();
  });

  it('shows nothing about the trial when it is 0', () => {
    renderFields({ trial_days: 0 });

    expect(screen.queryByText(/días de prueba/)).not.toBeInTheDocument();
  });

  it.each([
    [true, messages.subscriptions.badge.selfService],
    [false, messages.subscriptions.badge.custom],
  ])('shows the self-service badge %s as %s', (selfService, label) => {
    renderFields({ self_service: selfService });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('lists the included modules by name, in the fixed catalog order', () => {
    renderFields({ module_keys: ['billing', 'patients', 'finance'] });

    const list = within(valueOf(text.fields.modules)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      modules.catalog.patients.name,
      modules.catalog.finance.name,
      modules.catalog.billing.name,
    ]);
  });

  it('shows "No incluye" with the names of the modules that are missing', () => {
    renderFields({
      module_keys: [
        'patients',
        'scheduling',
        'reminders',
        'clinical_records',
        'clinical_record_templates',
        'prescriptions',
      ],
    });

    expect(
      screen.getByText(
        text.notIncluded(
          [
            modules.catalog.finance.name,
            modules.catalog.reports.name,
            modules.catalog.billing.name,
          ].join(', '),
        ),
      ),
    ).toBeInTheDocument();
  });

  it('shows no "No incluye" line when all nine modules are included', () => {
    renderFields({
      module_keys: [
        'patients',
        'scheduling',
        'reminders',
        'clinical_records',
        'clinical_record_templates',
        'prescriptions',
        'finance',
        'reports',
        'billing',
      ],
    });

    expect(screen.queryByText(/No incluye/)).not.toBeInTheDocument();
  });

  it('shows the four clinic limits', () => {
    renderFields({
      consulting_rooms_limit: 2,
      doctors_limit: 3,
      assistants_limit: 2,
      new_patients_per_year_limit: 15000,
    });

    expect(valueOf(text.fields.consultingRoomsLimit)).toHaveTextContent('2');
    expect(valueOf(text.fields.doctorsLimit)).toHaveTextContent('3');
    expect(valueOf(text.fields.assistantsLimit)).toHaveTextContent('2');
    expect(valueOf(text.fields.newPatientsPerYearLimit)).toHaveTextContent('15000');
  });

  it('shows other features as a list, in the order received', () => {
    renderFields();

    const list = within(valueOf(text.fields.otherFeatures)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Hasta 5 consultorios', 'Usuarios ilimitados', 'Agenda']);
  });

  it('says that there are no other features when the list is empty', () => {
    renderFields({ other_features: [] });

    expect(valueOf(text.fields.otherFeatures)).toHaveTextContent(text.noOtherFeatures);
    expect(within(valueOf(text.fields.otherFeatures)).queryByRole('list')).not.toBeInTheDocument();
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
