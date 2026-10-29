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
import { SubscriptionTypeField } from './SubscriptionTypeField';

const text = messages.subscriptions.form;
const catalog = messages.subscriptions.types.catalog;

function Harness({
  disabled,
  initial = SUBSCRIPTION_TYPE.INDIVIDUAL,
  clinicsLimit = '30',
}: {
  readonly disabled?: boolean;
  readonly initial?: number;
  readonly clinicsLimit?: string;
}) {
  const {
    control,
    setValue,
    watch,
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
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedClinicsLimit = watch('clinicsLimit');
  return (
    <>
      <SubscriptionTypeField
        control={control}
        setValue={setValue}
        errors={errors}
        disabled={disabled}
      />
      <p data-testid="clinics-limit-value">{watchedClinicsLimit}</p>
    </>
  );
}

function setup(
  props: {
    readonly disabled?: boolean;
    readonly initial?: number;
    readonly clinicsLimit?: string;
  } = {},
) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

describe('SubscriptionTypeField', () => {
  it('shows a switch, off by default, with the name and explanation of Individual', () => {
    setup();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const control = screen.getByRole('switch');
    expect(control).not.toBeChecked();
    expect(screen.getByText(catalog[1].name)).toBeInTheDocument();
    expect(screen.getByText(catalog[1].description)).toBeInTheDocument();
  });

  it('switches to Empresarial when turned on, and back to Individual when turned off', async () => {
    const { user } = setup();
    const control = screen.getByRole('switch');

    await user.click(control);

    expect(control).toBeChecked();
    expect(screen.getByText(catalog[2].name)).toBeInTheDocument();
    expect(screen.getByText(catalog[2].description)).toBeInTheDocument();

    await user.click(control);

    expect(control).not.toBeChecked();
    expect(screen.getByText(catalog[1].name)).toBeInTheDocument();
  });

  it('leaves the clinics limit at 1 when turned on, and again at 1 when turned off (research D6)', async () => {
    const { user } = setup({ clinicsLimit: '30' });

    await user.click(screen.getByRole('switch'));

    expect(screen.getByTestId('clinics-limit-value')).toHaveTextContent('1');

    await user.click(screen.getByRole('switch'));

    expect(screen.getByTestId('clinics-limit-value')).toHaveTextContent('1');
  });

  it('has an accessible group name of "Tipo de suscripción"', () => {
    setup();

    expect(screen.getByRole('group', { name: text.fields.subscriptionType })).toBeInTheDocument();
  });

  it('disables the switch and shows the immutability notice when disabled', () => {
    setup({ disabled: true, initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText(text.subscriptionTypeImmutableHelper)).toBeInTheDocument();
  });

  it('keeps showing the subscription’s own type while disabled', () => {
    setup({ disabled: true, initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText(catalog[2].name)).toBeInTheDocument();
  });

  it('is operable with the keyboard (Tab + Espacio)', async () => {
    const user = userEvent.setup();
    setup();

    await user.tab();
    expect(screen.getByRole('switch')).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('has no accessibility violations, enabled or disabled', async () => {
    const enabled = setup();
    expect(await axe(enabled.container)).toHaveNoViolations();

    const disabled = setup({ disabled: true });
    expect(await axe(disabled.container)).toHaveNoViolations();
  });
});
