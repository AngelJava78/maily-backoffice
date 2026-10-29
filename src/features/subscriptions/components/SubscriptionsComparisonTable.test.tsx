import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { ClinicModule } from '../schemas/clinicModule';
import { subscriptionSchema } from '../schemas/subscription';
import { SubscriptionsComparisonTable } from './SubscriptionsComparisonTable';

const text = messages.subscriptions.comparison;
const modulesText = messages.subscriptions.modules;

const MODULES: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: null, sortOrder: 10 },
  { key: 'schedule', name: 'Agenda', description: null, sortOrder: 20 },
  { key: 'reminders', name: 'Recordatorios', description: null, sortOrder: 30 },
];

const ESENCIAL = subscriptionSchema.parse(
  subscriptionDto({
    id: 1,
    name: 'Esencial',
    description: 'Para un doctor que solo necesita su agenda.',
    monthly_price: '499.00',
    annual_price: '4990.00',
    trial_days: 14,
    self_service: true,
    module_keys: ['patients', 'schedule'],
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
    module_keys: ['patients', 'schedule', 'reminders'],
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
      modules={MODULES}
      modulesLoading={false}
      modulesLoadFailed={false}
      onModulesRetry={vi.fn()}
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

  it('has one row per module of the catalog received, in the order received, not a fixed list', () => {
    renderTable();

    expect(screen.getByRole('row', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'Recordatorios' })).toBeInTheDocument();
  });

  it('marks a module as included or not for each subscription, from moduleKeys', () => {
    renderTable();

    const reminders = screen.getByRole('row', { name: 'Recordatorios' });
    // The row header (subscriptions.comparison label) is a <th>, not counted among 'cell's: the
    // first cell is Esencial (doesn't have "reminders"), the second is Empresarial (does).
    const [esencialCell, empresarialCell] = within(reminders).getAllByRole('cell');
    if (esencialCell === undefined || empresarialCell === undefined) {
      throw new Error('Expected two module cells in the "Recordatorios" row');
    }
    expect(
      within(esencialCell).getByRole('img', { name: text.moduleNotIncluded }),
    ).toBeInTheDocument();
    expect(
      within(empresarialCell).getByRole('img', { name: text.moduleIncluded }),
    ).toBeInTheDocument();
  });

  it('shows a loading indicator in place of the module rows while the catalog loads', () => {
    renderTable({ modulesLoading: true });

    expect(screen.getByLabelText(messages.common.loading)).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: 'Pacientes' })).not.toBeInTheDocument();
  });

  it('shows an error state with retry in place of the module rows when the catalog fails to load', async () => {
    const onModulesRetry = vi.fn();
    const user = userEvent.setup();
    renderTable({ modulesLoadFailed: true, onModulesRetry });

    expect(screen.getByText(modulesText.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(onModulesRetry).toHaveBeenCalledTimes(1);
  });

  it('has an edit link per subscription when canEdit is true, none when false', () => {
    const { rerender } = renderTable();
    expect(screen.getAllByText(text.editAction)).toHaveLength(2);

    rerender(
      <SubscriptionsComparisonTable
        subscriptions={[ESENCIAL, EMPRESARIAL]}
        cycle="monthly"
        canEdit={false}
        listSearch=""
        modules={MODULES}
        modulesLoading={false}
        modulesLoadFailed={false}
        onModulesRetry={vi.fn()}
      />,
    );
    expect(screen.queryByText(text.editAction)).not.toBeInTheDocument();
  });

  it('has no accessibility violations, with data, loading or failed', async () => {
    const { container: withData } = renderTable();
    expect(await axe(withData)).toHaveNoViolations();

    const { container: loading } = renderTable({ modulesLoading: true });
    expect(await axe(loading)).toHaveNoViolations();

    const { container: failed } = renderTable({ modulesLoadFailed: true });
    expect(await axe(failed)).toHaveNoViolations();
  });
});
