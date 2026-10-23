import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY, type ClinicModuleKey } from '../schemas/clinicModuleCatalog';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { ModulesField } from './ModulesField';

const text = messages.subscriptions.modules;

/** A form of React Hook Form with only the modules, as the screens hold it. */
function Harness({
  moduleKeys = new Set<ClinicModuleKey>([REQUIRED_MODULE_KEY]),
}: {
  readonly moduleKeys?: ReadonlySet<ClinicModuleKey>;
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
  return <ModulesField control={control} errors={errors} />;
}

function setup(moduleKeys?: ReadonlySet<ClinicModuleKey>) {
  const user = userEvent.setup();
  const view = render(<Harness moduleKeys={moduleKeys} />);
  return { ...view, user };
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) });

describe('ModulesField', () => {
  it('shows "Pacientes" checked and disabled, with "Siempre incluido"', () => {
    setup();

    const patients = checkbox(text.catalog.patients.name);
    expect(patients).toBeChecked();
    expect(patients).toBeDisabled();
    expect(screen.getByText(text.alwaysIncluded)).toBeInTheDocument();
  });

  it('shows the other eight unmarked by default, with their description', () => {
    setup();

    expect(checkbox(text.catalog.scheduling.name)).not.toBeChecked();
    expect(screen.getByText(text.catalog.scheduling.description)).toBeInTheDocument();
  });

  it('shows "Requiere <módulo>" next to each of the four dependent modules', () => {
    setup();

    // Recordatorios requires Agenda y citas (one module); Plantillas de expediente and Recetas
    // both require Expediente clínico (two modules share the same requirement text).
    expect(
      screen.getAllByText(text.requires(text.catalog.scheduling.name), { exact: false }),
    ).toHaveLength(1);
    expect(
      screen.getAllByText(text.requires(text.catalog.clinical_records.name), { exact: false }),
    ).toHaveLength(2);
  });

  it('shows the counter "Marcados: N de 9"', () => {
    setup(new Set([REQUIRED_MODULE_KEY, 'scheduling', 'reminders']));

    expect(screen.getByText(text.marked(3))).toBeInTheDocument();
  });

  it('marking a dependent module also marks its prerequisite', async () => {
    const { user } = setup();

    await user.click(checkbox(text.catalog.reminders.name));

    expect(checkbox(text.catalog.reminders.name)).toBeChecked();
    expect(checkbox(text.catalog.scheduling.name)).toBeChecked();
    expect(screen.getByText(text.marked(3))).toBeInTheDocument();
  });

  it('unmarking a prerequisite also unmarks its dependent', async () => {
    const { user } = setup(new Set([REQUIRED_MODULE_KEY, 'scheduling', 'reminders']));

    await user.click(checkbox(text.catalog.scheduling.name));

    expect(checkbox(text.catalog.scheduling.name)).not.toBeChecked();
    expect(checkbox(text.catalog.reminders.name)).not.toBeChecked();
    expect(screen.getByText(text.marked(1))).toBeInTheDocument();
  });

  it('is a fieldset with a legend', () => {
    setup();

    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();

    expect(await axe(container)).toHaveNoViolations();
  });
});
