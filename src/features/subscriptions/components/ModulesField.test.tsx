import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { ClinicModule } from '../schemas/clinicModule';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { ModulesField } from './ModulesField';

const text = messages.subscriptions.modules;

const MODULES: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: 'Directorio de pacientes.', sortOrder: 10 },
  {
    key: 'scheduling',
    name: 'Agenda y citas',
    description: 'Calendario por doctor.',
    sortOrder: 20,
  },
  { key: 'reminders', name: 'Recordatorios', description: 'Avisos de cita.', sortOrder: 30 },
];

/** A form of React Hook Form with only the modules, as the screens hold it. */
function Harness({
  moduleKeys = new Set<string>(['patients']),
  modules = MODULES,
  loading = false,
  loadFailed = false,
  onRetry = vi.fn(),
}: {
  readonly moduleKeys?: ReadonlySet<string>;
  readonly modules?: readonly ClinicModule[];
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
  readonly onRetry?: () => void;
}) {
  const {
    control,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: 'Pro',
      description: '',
      monthlyPrice: '1',
      annualPrice: '10',
      trialDays: '0',
      selfService: false,
      moduleKeys,
      consultingRoomsLimit: '1',
      doctorsLimit: '1',
      assistantsLimit: '0',
      newPatientsPerYearLimit: '0',
      otherFeatures: [],
    },
  });
  return (
    <ModulesField
      control={control}
      errors={errors}
      modules={modules}
      loading={loading}
      loadFailed={loadFailed}
      onRetry={onRetry}
    />
  );
}

function setup(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) });

describe('ModulesField', () => {
  it('shows "Pacientes" checked and disabled, with "Siempre incluido"', () => {
    setup();

    const patients = checkbox('Pacientes');
    expect(patients).toBeChecked();
    expect(patients).toBeDisabled();
    expect(screen.getByText(text.alwaysIncluded)).toBeInTheDocument();
  });

  it('shows "Pacientes" checked even when the subscription did not have it saved', () => {
    setup({ moduleKeys: new Set(['scheduling']) });

    expect(checkbox('Pacientes')).toBeChecked();
  });

  it('shows the other modules unmarked by default, with their description, in the order received', () => {
    setup();

    const scheduling = checkbox('Agenda y citas');
    expect(scheduling).not.toBeChecked();
    expect(screen.getByText('Calendario por doctor.')).toBeInTheDocument();
    const names = screen.getAllByRole('checkbox').map((el) => el.getAttribute('aria-label') ?? '');
    expect(names.length).toBeGreaterThan(0);
  });

  it('shows the counter "Marcados: N de M" with the real size of the catalog', () => {
    setup({ moduleKeys: new Set(['patients', 'scheduling']) });

    expect(screen.getByText(text.marked(2, 3))).toBeInTheDocument();
  });

  it('marks and unmarks a non-required module independently, without affecting any other', async () => {
    const { user } = setup();

    await user.click(checkbox('Recordatorios'));

    expect(checkbox('Recordatorios')).toBeChecked();
    expect(checkbox('Agenda y citas')).not.toBeChecked();
    expect(screen.getByText(text.marked(2, 3))).toBeInTheDocument();

    await user.click(checkbox('Recordatorios'));

    expect(checkbox('Recordatorios')).not.toBeChecked();
    expect(screen.getByText(text.marked(1, 3))).toBeInTheDocument();
  });

  it('does not show a "Requiere" hint for any module: there are no dependencies any more', () => {
    setup();

    expect(screen.queryByText(/Requiere/)).not.toBeInTheDocument();
  });

  it('shows a loading indicator and no checkboxes while the catalog is loading', () => {
    setup({ loading: true });

    expect(screen.getByLabelText(messages.common.loading)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows an error state with retry when the catalog fails to load', async () => {
    const onRetry = vi.fn();
    const { user } = setup({ loadFailed: true, onRetry });

    expect(screen.getByText(text.loadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an empty warning when the catalog loaded with no modules', () => {
    setup({ modules: [] });

    expect(screen.getByText(text.empty)).toBeInTheDocument();
  });

  it('is a fieldset with a legend', () => {
    setup();

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has no accessibility violations, loading, failed, empty or with data', async () => {
    const { container: withData } = render(<Harness />);
    expect(await axe(withData)).toHaveNoViolations();

    const { container: loading } = render(<Harness loading />);
    expect(await axe(loading)).toHaveNoViolations();

    const { container: failed } = render(<Harness loadFailed />);
    expect(await axe(failed)).toHaveNoViolations();

    const { container: empty } = render(<Harness modules={[]} />);
    expect(await axe(empty)).toHaveNoViolations();
  });
});
