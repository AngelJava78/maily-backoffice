import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import { subscriptionFormSchema, type SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SUBSCRIPTION_TYPE } from '../schemas/subscriptionTypeCatalog';
import { SubscriptionTypeField } from './SubscriptionTypeField';

const text = messages.subscriptions.form;
const catalog = messages.subscriptions.types.catalog;

function Harness({
  disabled,
  initial = SUBSCRIPTION_TYPE.INDIVIDUAL,
}: {
  readonly disabled?: boolean;
  readonly initial?: number;
}) {
  const {
    control,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: 'Pro',
      description: '',
      subscriptionTypeId: initial,
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
  return <SubscriptionTypeField control={control} errors={errors} disabled={disabled} />;
}

function setup(props: { readonly disabled?: boolean; readonly initial?: number } = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

describe('SubscriptionTypeField', () => {
  it('shows the two options with their name and explanation, Individual marked by default', () => {
    setup();

    expect(
      screen.getByRole('button', { name: new RegExp(`^${catalog[1].name}`), pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`), pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(catalog[1].description)).toBeInTheDocument();
    expect(screen.getByText(catalog[2].description)).toBeInTheDocument();
  });

  it('has an accessible group name of "Tipo de suscripción"', () => {
    setup();

    expect(screen.getByRole('group', { name: text.fields.subscriptionType })).toBeInTheDocument();
  });

  it('can be changed to Empresarial', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`) }));

    expect(
      screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`), pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${catalog[1].name}`), pressed: false }),
    ).toBeInTheDocument();
  });

  it('never ends up with neither option marked: deselecting the only pressed one is ignored', async () => {
    const { user } = setup();
    const individual = screen.getByRole('button', { name: new RegExp(`^${catalog[1].name}`) });

    await user.click(individual);

    expect(individual).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables both options and shows the immutability notice when disabled', () => {
    setup({ disabled: true, initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    expect(screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`) })).toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(`^${catalog[1].name}`) })).toBeDisabled();
    expect(screen.getByText(text.subscriptionTypeImmutableHelper)).toBeInTheDocument();
  });

  it('keeps showing the subscription’s own type while disabled', () => {
    setup({ disabled: true, initial: SUBSCRIPTION_TYPE.ENTERPRISE });

    expect(
      screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`), pressed: true }),
    ).toBeInTheDocument();
  });

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup();
    setup();

    await user.tab();
    expect(screen.getByRole('button', { name: new RegExp(`^${catalog[1].name}`) })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: new RegExp(`^${catalog[2].name}`) })).toHaveFocus();
  });

  it('has no accessibility violations, enabled or disabled', async () => {
    const enabled = setup();
    expect(await axe(enabled.container)).toHaveNoViolations();

    const disabled = setup({ disabled: true });
    expect(await axe(disabled.container)).toHaveNoViolations();
  });
});
