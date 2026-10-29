import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { ClinicModule } from '../schemas/clinicModule';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';
import { SubscriptionFormFields } from './SubscriptionFormFields';

const text = messages.subscriptions.form;
const validation = messages.subscriptions.validation;
const typeCatalog = messages.subscriptions.types.catalog;

const MODULES: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: 'Directorio de pacientes.', sortOrder: 10 },
  { key: 'scheduling', name: 'Agenda y citas', description: 'Calendario.', sortOrder: 20 },
];

const CLINIC_MODULES_CATALOG = {
  modules: MODULES,
  loading: false,
  loadFailed: false,
  onRetry: () => undefined,
};

function Harness({ disableSubscriptionType }: { readonly disableSubscriptionType?: boolean } = {}) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      subscriptionTypeId: SUBSCRIPTION_TYPE.INDIVIDUAL,
      clinicsLimit: '1',
      monthlyPrice: '',
      annualPrice: '',
      trialDays: '0',
      selfService: false,
      moduleKeys: new Set(['patients']),
      consultingRoomsLimit: '',
      doctorsLimit: '',
      assistantsLimit: '',
      newPatientsPerYearLimit: '',
      otherFeatures: [],
    },
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(() => undefined)(event);
      }}
    >
      <SubscriptionFormFields
        register={register}
        control={control}
        setValue={setValue}
        errors={errors}
        disableSubscriptionType={disableSubscriptionType}
        clinicModules={CLINIC_MODULES_CATALOG}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup(props: { readonly disableSubscriptionType?: boolean } = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

const name = () => screen.getByRole('textbox', { name: new RegExp(`^${text.fields.name}`) });
const description = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.description}`) });
const price = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.monthlyPrice}`) });
const annualPrice = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.annualPrice}`) });

describe('SubscriptionFormFields', () => {
  it('asks for the name, which is required', () => {
    setup();

    expect(name()).toBeRequired();
  });

  it('asks for a description of several lines, with its help', () => {
    setup();

    expect(description().tagName).toBe('TEXTAREA');
    expect(description()).not.toBeRequired();
    expect(description()).toHaveAccessibleDescription(text.descriptionHelper);
  });

  it('asks for the monthly price in pesos per month, with a numeric keyboard and its help', () => {
    setup();

    expect(price()).toBeRequired();
    expect(price()).toHaveAttribute('inputmode', 'decimal');
    expect(price()).toHaveAccessibleDescription(text.priceHelper);
    expect(screen.getAllByText(text.pricePrefix).length).toBeGreaterThan(0);
    expect(screen.getByText(text.priceSuffix)).toBeInTheDocument();
  });

  it('asks for the annual price in pesos per year, with its help', () => {
    setup();

    expect(annualPrice()).toBeRequired();
    expect(annualPrice()).toHaveAttribute('inputmode', 'decimal');
    expect(annualPrice()).toHaveAccessibleDescription(text.annualPriceHelper);
    expect(screen.getByText(text.annualPriceSuffix)).toBeInTheDocument();
  });

  it('tells an annual price written with a comma as an error of that field', async () => {
    const { user } = setup();
    await user.type(annualPrice(), '12,990');

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(annualPrice()).toHaveAccessibleDescription(validation.annualPriceInvalid);
  });

  it('asks for autoconsumo and the trial days', () => {
    setup();

    expect(
      screen.getByRole('switch', { name: new RegExp(`^${text.fields.selfService}`) }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('textbox', { name: new RegExp(`^${text.fields.trialDays}`) }),
    ).toHaveValue('0');
  });

  it('asks for the clinic modules of the vigente catalog, with "Pacientes" always marked (021)', () => {
    setup();

    expect(screen.getByRole('checkbox', { name: new RegExp('^Pacientes') })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: new RegExp('^Agenda y citas') })).not.toBeChecked();
    expect(screen.getByText(messages.subscriptions.modules.marked(1, 2))).toBeInTheDocument();
  });

  it('asks for the four clinic limits', () => {
    setup();

    expect(
      screen.getByRole('textbox', { name: new RegExp(`^${text.fields.consultingRoomsLimit}`) }),
    ).toBeRequired();
    expect(
      screen.getByRole('textbox', { name: new RegExp(`^${text.fields.newPatientsPerYearLimit}`) }),
    ).toBeRequired();
  });

  it('asks for other features', () => {
    setup();

    expect(screen.getByRole('group', { name: text.fields.otherFeatures })).toBeInTheDocument();
  });

  it('has no field for the status: a subscription is born active', () => {
    setup();

    expect(screen.queryByLabelText(/estatus/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('asks for the subscription type first, enabled, off (Individual) by default', () => {
    setup();

    const typeSwitch = screen.getByRole('switch', {
      name: new RegExp(`^${typeCatalog[1].name}`),
    });
    expect(typeSwitch).toBeInTheDocument();
    expect(typeSwitch).not.toBeChecked();
    expect(typeSwitch).not.toBeDisabled();
  });

  it('disables the subscription type control when disableSubscriptionType is passed', () => {
    setup({ disableSubscriptionType: true });

    expect(
      screen.getByRole('switch', { name: new RegExp(`^${typeCatalog[1].name}`) }),
    ).toBeDisabled();
    expect(screen.getByText(text.subscriptionTypeImmutableHelper)).toBeInTheDocument();
  });

  it('groups the clinics limit with the clinic limits, under a "Límites" title (020)', () => {
    setup();

    const limitsTitle = screen.getByText(text.fields.limits);
    expect(limitsTitle.tagName.toLowerCase()).toBe('legend');

    const clinicsLimit = screen.getByRole('textbox', {
      name: new RegExp(`^${text.fields.clinicsLimit}`),
    });
    const consultingRoomsLimit = screen.getByRole('textbox', {
      name: new RegExp(`^${text.fields.consultingRoomsLimit}`),
    });
    // The clinics limit comes first within the section, before the other four limits.
    expect(
      clinicsLimit.compareDocumentPosition(consultingRoomsLimit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // It no longer sits right after the subscription type, before the name: the name now comes first.
    expect(
      name().compareDocumentPosition(clinicsLimit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the clinics limit disabled at 1 while the subscription type is Individual', () => {
    setup();

    const clinicsLimit = screen.getByRole('textbox', {
      name: new RegExp(`^${text.fields.clinicsLimit}`),
    });
    expect(clinicsLimit).toBeDisabled();
    expect(clinicsLimit).toHaveValue('1');
  });

  it('associates each error with its field', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(name()).toHaveAccessibleDescription(validation.nameRequired);
    expect(price()).toHaveAccessibleDescription(validation.priceRequired);
    expect(name()).toHaveAttribute('aria-invalid', 'true');
  });

  it('tells a price written with a comma as an error of that field', async () => {
    const { user } = setup();
    await user.type(name(), 'Pro');
    await user.type(price(), '4,500');

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(price()).toHaveAccessibleDescription(validation.priceInvalid);
  });

  it('has no accessibility violations, with and without errors', async () => {
    const { container, user } = setup();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
