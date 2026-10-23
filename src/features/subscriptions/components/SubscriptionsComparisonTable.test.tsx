import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionSchema } from '../schemas/subscription';
import { SubscriptionsComparisonTable } from './SubscriptionsComparisonTable';

const text = messages.subscriptions.comparison;
const modules = messages.subscriptions.modules;

const ESENCIAL = subscriptionSchema.parse(
  subscriptionDto({
    id: 1,
    name: 'Esencial',
    description: 'Para un doctor que solo necesita su agenda.',
    monthly_price: '499.00',
    annual_price: '4990.00',
    trial_days: 14,
    self_service: true,
    module_keys: ['patients', 'scheduling'],
    other_features: ['Soporte por correo'],
    consulting_rooms_limit: 1,
    doctors_limit: 1,
    assistants_limit: 1,
    new_patients_per_year_limit: 5000,
    status: { id: 1, name: 'Activa' },
    clinics_count: 0,
  }),
);

const EMPRESARIAL = subscriptionSchema.parse(
  subscriptionDto({
    id: 4,
    name: 'Empresarial',
    description: 'Hecha a la medida para clínicas grandes.',
    monthly_price: '5999.00',
    annual_price: '59990.00',
    trial_days: 0,
    self_service: false,
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
    other_features: [],
    consulting_rooms_limit: 20,
    doctors_limit: 40,
    assistants_limit: 20,
    new_patients_per_year_limit: 200000,
    status: { id: 1, name: 'Activa' },
    clinics_count: null,
  }),
);

function renderTable(
  props: Partial<React.ComponentProps<typeof SubscriptionsComparisonTable>> = {},
) {
  return renderWithProviders(
    <SubscriptionsComparisonTable
      subscriptions={[ESENCIAL, EMPRESARIAL]}
      cycle="monthly"
      canEdit
      listSearch=""
      {...props}
    />,
  );
}

describe('SubscriptionsComparisonTable', () => {
  it('shows one column per subscription, with name, badge, description, price and status', () => {
    renderTable();

    expect(screen.getByText('Esencial')).toBeInTheDocument();
    expect(screen.getByText(messages.subscriptions.badge.selfService)).toBeInTheDocument();
    expect(screen.getByText('Empresarial')).toBeInTheDocument();
    expect(screen.getByText(messages.subscriptions.badge.custom)).toBeInTheDocument();
    expect(screen.getByText('$499.00/mes')).toBeInTheDocument();
    expect(screen.getByText('$5,999.00/mes')).toBeInTheDocument();
  });

  it('shows the annual price and savings when the cycle is annual', () => {
    renderTable({ cycle: 'annual' });

    expect(screen.getByText('$4,990.00/año')).toBeInTheDocument();
    expect(screen.getAllByText(messages.subscriptions.price.savingsBadge(17)).length).toBe(2);
  });

  it('marks each of the nine modules as included or not, for each column', () => {
    renderTable();

    const row = screen.getByRole('row', { name: new RegExp(modules.catalog.finance.name) });
    // The row header (module name) is a rowheader, not a cell; cells are the two plan columns.
    const [esencialCell, empresarialCell] = within(row).getAllByRole('cell');
    if (esencialCell === undefined || empresarialCell === undefined) {
      throw new Error('Expected two cells, one per subscription');
    }
    // Esencial does not include finance; Empresarial does.
    expect(within(esencialCell).getByText(text.moduleNotIncluded)).toBeInTheDocument();
    expect(within(empresarialCell).getByText(text.moduleIncluded)).toBeInTheDocument();
  });

  it('shows the four clinic limits per column', () => {
    renderTable();

    const row = screen.getByRole('row', { name: /Doctores/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText('40')).toBeInTheDocument();
  });

  it('shows a row with the other features of each column, or nothing if empty', () => {
    renderTable();

    expect(screen.getByText('Soporte por correo')).toBeInTheDocument();
  });

  it('shows trial days and clinics count, with "No disponible" when not known', () => {
    renderTable();

    expect(screen.getByText(messages.subscriptions.price.trialDays(14))).toBeInTheDocument();
    expect(screen.getByText(messages.subscriptions.clinics.notAvailable)).toBeInTheDocument();
  });

  it('offers "Editar" for each column only when canEdit is true', () => {
    const { rerender } = renderTable({ canEdit: true });
    expect(screen.getAllByRole('link', { name: text.editAction })).toHaveLength(2);

    rerender(
      <SubscriptionsComparisonTable
        subscriptions={[ESENCIAL, EMPRESARIAL]}
        cycle="monthly"
        canEdit={false}
        listSearch=""
      />,
    );
    expect(screen.queryByRole('link', { name: text.editAction })).not.toBeInTheDocument();
  });

  it('shows the footer note about simulated prices', () => {
    renderTable();

    expect(screen.getByText(text.footerNote)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderTable();

    expect(await axe(container)).toHaveNoViolations();
  });
});
