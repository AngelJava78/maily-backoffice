import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { ClinicLimitsFields } from './ClinicLimitsFields';

const text = messages.subscriptions.form;
const validation = messages.subscriptions.validation;

function Harness() {
  const {
    register,
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
      <ClinicLimitsFields register={register} errors={errors} />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = render(<Harness />);
  return { ...view, user };
}

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });

describe('ClinicLimitsFields', () => {
  it('asks for the four limits, each with its help text', () => {
    setup();

    expect(field(text.fields.consultingRoomsLimit)).toHaveAccessibleDescription(
      text.consultingRoomsLimitHelper,
    );
    expect(field(text.fields.doctorsLimit)).toHaveAccessibleDescription(text.doctorsLimitHelper);
    expect(field(text.fields.assistantsLimit)).toHaveAccessibleDescription(
      text.assistantsLimitHelper,
    );
    expect(field(text.fields.newPatientsPerYearLimit)).toHaveAccessibleDescription(
      text.newPatientsPerYearLimitHelper,
    );
  });

  it('shows the error for an empty or out-of-range limit', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(field(text.fields.consultingRoomsLimit)).toHaveAccessibleDescription(
      validation.consultingRoomsLimitInvalid,
    );
  });

  it('has no accessibility violations, with and without errors', async () => {
    const { container, user } = setup();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
