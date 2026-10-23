import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SubscriptionFormFields } from './SubscriptionFormFields';

const text = messages.subscriptions.form;
const validation = messages.subscriptions.validation;

function Harness() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      monthlyPrice: '',
      annualPrice: '',
      trialDays: '0',
      selfService: false,
      moduleKeys: new Set([REQUIRED_MODULE_KEY]),
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
      <SubscriptionFormFields register={register} control={control} errors={errors} />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = render(<Harness />);
  return { ...view, user };
}

const name = () => screen.getByRole('textbox', { name: new RegExp(`^${text.fields.name}`) });
const description = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.description}`) });
const price = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.monthlyPrice}`) });

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
    expect(screen.getByText(text.pricePrefix)).toBeInTheDocument();
    expect(screen.getByText(text.priceSuffix)).toBeInTheDocument();
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
