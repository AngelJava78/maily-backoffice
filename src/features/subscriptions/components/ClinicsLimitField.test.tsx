import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModule';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';
import { ClinicsLimitField } from './ClinicsLimitField';

const text = messages.subscriptions.form;
const validation = messages.subscriptions.validation;

function Harness({
  initial = SUBSCRIPTION_TYPE.INDIVIDUAL,
  clinicsLimit = '1',
}: {
  readonly initial?: number;
  readonly clinicsLimit?: string;
} = {}) {
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
      subscriptionTypeId: initial,
      clinicsLimit,
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
      <ClinicsLimitField register={register} control={control} errors={errors} />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup(props: { readonly initial?: number; readonly clinicsLimit?: string } = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

const field = () =>
  screen.getByRole('textbox', { name: new RegExp(`^${text.fields.clinicsLimit}`) });

describe('ClinicsLimitField', () => {
  it('shows a fixed 1, disabled, with its own helper, for an Individual subscription', () => {
    setup();

    expect(field()).toHaveValue('1');
    expect(field()).toBeDisabled();
    expect(field()).toHaveAccessibleDescription(text.clinicsLimitFixedHelper);
  });

  it('is editable, with its own helper, for an Empresarial subscription', async () => {
    const { user } = setup({ initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    expect(field()).not.toBeDisabled();
    expect(field()).toHaveAccessibleDescription(text.clinicsLimitHelper);

    await user.clear(field());
    await user.type(field(), '25');

    expect(field()).toHaveValue('25');
  });

  it('shows the error for an Empresarial subscription outside 1 to 100', async () => {
    const { user } = setup({ initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    await user.clear(field());
    await user.type(field(), '0');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(field()).toHaveAccessibleDescription(validation.clinicsLimitInvalid);
  });

  it('has no accessibility violations, enabled or disabled', async () => {
    const enabled = setup({ initial: SUBSCRIPTION_TYPE.ENTERPRISE });
    expect(await axe(enabled.container)).toHaveNoViolations();

    const disabled = setup();
    expect(await axe(disabled.container)).toHaveNoViolations();
  });
});
