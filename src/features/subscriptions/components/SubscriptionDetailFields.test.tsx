import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { subscriptionDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { ClinicModule } from '../schemas/clinicModule';
import { subscriptionSchema } from '../schemas/subscription';
import { SubscriptionDetailFields } from './SubscriptionDetailFields';

const text = messages.subscriptions.detail;
const modulesText = messages.subscriptions.modules;

const MODULES: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: null, sortOrder: 10 },
  { key: 'schedule', name: 'Agenda', description: null, sortOrder: 20 },
  { key: 'appointments', name: 'Citas', description: null, sortOrder: 30 },
  { key: 'reports', name: 'Reportes', description: null, sortOrder: 40 },
];

function renderFields(
  overrides: Parameters<typeof subscriptionDto>[0] = {},
  moduleProps: {
    readonly modules?: readonly ClinicModule[];
    readonly loading?: boolean;
    readonly loadFailed?: boolean;
    readonly onRetry?: () => void;
  } = {},
) {
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
      modules={moduleProps.modules ?? MODULES}
      loading={moduleProps.loading ?? false}
      loadFailed={moduleProps.loadFailed ?? false}
      onRetry={moduleProps.onRetry ?? vi.fn()}
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
    expect(valueOf(text.fields.type)).toHaveTextContent('Individual');
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

  it.each([
    [1, 'Individual'],
    [2, 'Empresarial'],
  ])(
    'shows the subscription type %i by its own catalog name (%s), not the name of the API',
    (id) => {
      renderFields({ subscription_type: { id, name: 'Otro nombre que la API pudiera enviar' } });

      expect(valueOf(text.fields.type)).toHaveTextContent(id === 1 ? 'Individual' : 'Empresarial');
    },
  );

  it('falls back to the type name of the API for an id outside today’s catalog of two', () => {
    renderFields({ subscription_type: { id: 3, name: 'Futuro' } });

    expect(valueOf(text.fields.type)).toHaveTextContent('Futuro');
  });

  it('shows the clinics limit next to the type', () => {
    renderFields({ clinics_limit: 25 });

    expect(valueOf(text.fields.clinicsLimit)).toHaveTextContent('25');
  });

  it('shows «No disponible» for the clinics limit while the API does not send it', () => {
    renderFields({ clinics_limit: null });

    expect(valueOf(text.fields.clinicsLimit)).toHaveTextContent(
      messages.subscriptions.clinics.notAvailable,
    );
  });

  it('lists the included modules by name, in the catalog order (sort_order), not the saved order', () => {
    renderFields({ module_keys: ['reports', 'patients', 'schedule'] });

    const list = within(valueOf(text.fields.modules)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Pacientes', 'Agenda', 'Reportes']);
  });

  it('shows "No incluye" with the names of the catalog modules that are missing', () => {
    renderFields({ module_keys: ['patients', 'schedule'] });

    expect(
      screen.getByText(text.notIncluded(['Citas', 'Reportes'].join(', '))),
    ).toBeInTheDocument();
  });

  it('shows no "No incluye" line when every catalog module is included', () => {
    renderFields({ module_keys: ['patients', 'schedule', 'appointments', 'reports'] });

    expect(screen.queryByText(/No incluye/)).not.toBeInTheDocument();
  });

  it('shows a saved key missing from the catalog at the end of the included list, as "(no disponible)" (FR-006)', () => {
    renderFields({ module_keys: ['patients', 'retired_module'] });

    const list = within(valueOf(text.fields.modules)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Pacientes', text.moduleUnavailable('retired_module')]);
  });

  it('never lists a key missing from the catalog in the "No incluye" line, only real catalog names', () => {
    renderFields({ module_keys: ['patients', 'retired_module'] });

    const notIncludedLine = screen.getByText(
      text.notIncluded(['Agenda', 'Citas', 'Reportes'].join(', ')),
    );
    expect(notIncludedLine).toBeInTheDocument();
    expect(notIncludedLine).not.toHaveTextContent('retired_module');
  });

  it('shows only "(no disponible)" entries, with "No incluye" naming the whole catalog, when none of the saved keys match it', () => {
    renderFields({ module_keys: ['retired_a', 'retired_b'] });

    const list = within(valueOf(text.fields.modules)).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['retired_a (no disponible)', 'retired_b (no disponible)']);
    expect(
      screen.getByText(text.notIncluded(['Pacientes', 'Agenda', 'Citas', 'Reportes'].join(', '))),
    ).toBeInTheDocument();
  });

  it('shows a loading indicator in the modules section while the catalog loads, keeping the rest of the detail', () => {
    renderFields({}, { loading: true });

    expect(
      within(valueOf(text.fields.modules)).getByLabelText(messages.common.loading),
    ).toBeInTheDocument();
    expect(valueOf(text.fields.name)).toHaveTextContent('Pro');
  });

  it('shows an error state with retry in the modules section when the catalog fails to load', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderFields({}, { loadFailed: true, onRetry });

    expect(
      within(valueOf(text.fields.modules)).getByText(modulesText.loadError.title),
    ).toBeInTheDocument();
    await user.click(
      within(valueOf(text.fields.modules)).getByRole('button', { name: /reintentar/i }),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
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

  it('has no accessibility violations, with data, loading or failed', async () => {
    const { container: withData } = renderFields();
    expect(await axe(withData)).toHaveNoViolations();

    const { container: loading } = renderFields({}, { loading: true });
    expect(await axe(loading)).toHaveNoViolations();

    const { container: failed } = renderFields({}, { loadFailed: true });
    expect(await axe(failed)).toHaveNoViolations();
  });
});
