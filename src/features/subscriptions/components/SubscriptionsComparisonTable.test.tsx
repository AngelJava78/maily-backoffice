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
    clinics_limit: null,
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

  it('marks each of the nine modules with an icon, never the "Incluido"/"No incluido" text (020, FR-011)', () => {
    renderTable();

    const row = screen.getByRole('row', { name: new RegExp(modules.catalog.finance.name) });
    // The row header (module name) is a rowheader, not a cell; cells are the two plan columns.
    const [esencialCell, empresarialCell] = within(row).getAllByRole('cell');
    if (esencialCell === undefined || empresarialCell === undefined) {
      throw new Error('Expected two cells, one per subscription');
    }
    // Esencial does not include finance; Empresarial does. The accessible name carries the same
    // text the cell used to show, now as the icon's name instead of visible content.
    expect(
      within(esencialCell).getByRole('img', { name: text.moduleNotIncluded }),
    ).toBeInTheDocument();
    expect(
      within(empresarialCell).getByRole('img', { name: text.moduleIncluded }),
    ).toBeInTheDocument();
    expect(within(esencialCell).queryByText(text.moduleNotIncluded)).not.toBeInTheDocument();
    expect(within(empresarialCell).queryByText(text.moduleIncluded)).not.toBeInTheDocument();
  });

  it('shows the four clinic limits per column', () => {
    renderTable();

    const row = screen.getByRole('row', { name: /Doctores/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText('40')).toBeInTheDocument();
  });

  it('shows the clinics limit first in «Límites de la clínica», with «No disponible» when it is null (020, FR-010)', () => {
    renderTable();

    const row = screen.getByRole('row', { name: text.sections.clinicsLimit });
    const [esencialCell, empresarialCell] = within(row).getAllByRole('cell');
    if (esencialCell === undefined || empresarialCell === undefined) {
      throw new Error('Expected two cells, one per subscription');
    }
    expect(within(esencialCell).getByText('1')).toBeInTheDocument();
    expect(
      within(empresarialCell).getByText(messages.subscriptions.clinics.notAvailable),
    ).toBeInTheDocument();

    // It comes before Consultorios, the first of the four already-existing limits.
    const consultingRoomsRow = screen.getByRole('row', { name: /Consultorios/ });
    expect(
      row.compareDocumentPosition(consultingRoomsRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows a row with the other features of each column, or nothing if empty', () => {
    renderTable();

    expect(screen.getByText('Soporte por correo')).toBeInTheDocument();
  });

  it('shows trial days and clinics count, with "No disponible" when not known', () => {
    renderTable();

    expect(screen.getByText(messages.subscriptions.price.trialDays(14))).toBeInTheDocument();
    const row = screen.getByRole('row', { name: text.sections.clinics });
    expect(within(row).getByText(messages.subscriptions.clinics.notAvailable)).toBeInTheDocument();
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
