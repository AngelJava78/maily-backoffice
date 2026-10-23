import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SelfServiceAndTrialFields } from './SelfServiceAndTrialFields';

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
      name: 'Pro',
      description: '',
      monthlyPrice: '1',
      annualPrice: '10',
      trialDays: '0',
      selfService: false,
      moduleKeys: new Set([REQUIRED_MODULE_KEY]),
      consultingRoomsLimit: '1',
      doctorsLimit: '1',
      assistantsLimit: '0',
      newPatientsPerYearLimit: '0',
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
      <SelfServiceAndTrialFields register={register} control={control} errors={errors} />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = render(<Harness />);
  return { ...view, user };
}

describe('SelfServiceAndTrialFields', () => {
  it('shows the self-service switch off by default, with its help text', () => {
    setup();

    const toggle = screen.getByRole('switch', { name: new RegExp(`^${text.fields.selfService}`) });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(text.selfServiceHelper)).toBeInTheDocument();
  });

  it('can be switched on', async () => {
    const { user } = setup();

    await user.click(
      screen.getByRole('switch', { name: new RegExp(`^${text.fields.selfService}`) }),
    );

    expect(
      screen.getByRole('switch', { name: new RegExp(`^${text.fields.selfService}`) }),
    ).toBeChecked();
  });

  it('shows the trial days field with its help text', () => {
    setup();

    const field = screen.getByRole('textbox', {
      name: new RegExp(`^${text.fields.trialDays}`),
    });
    expect(field).toHaveValue('0');
    expect(field).toHaveAccessibleDescription(text.trialDaysHelper);
  });

  it('shows an error for a trial days value out of range', async () => {
    const { user } = setup();
    const field = screen.getByRole('textbox', {
      name: new RegExp(`^${text.fields.trialDays}`),
    });

    await user.clear(field);
    await user.type(field, '4000');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(field).toHaveAccessibleDescription(validation.trialDaysInvalid);
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();

    expect(await axe(container)).toHaveNoViolations();
  });
});
