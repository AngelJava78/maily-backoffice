import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog';
import {
  MAX_OTHER_FEATURES,
  subscriptionFormSchema,
  type SubscriptionFormValues,
} from '../schemas/subscriptionForm';
import { OtherFeaturesField } from './OtherFeaturesField';

const text = messages.subscriptions.form;

/** A form of React Hook Form with only other features, as the screens hold it. */
function Harness({
  otherFeatures,
  serverError,
}: {
  readonly otherFeatures: readonly string[];
  readonly serverError?: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: 'Pro',
      description: '',
      subscriptionTypeId: 1,
      clinicsLimit: '1',
      monthlyPrice: '1',
      annualPrice: '10',
      trialDays: '0',
      selfService: false,
      moduleKeys: new Set([REQUIRED_MODULE_KEY]),
      consultingRoomsLimit: '1',
      doctorsLimit: '1',
      assistantsLimit: '0',
      newPatientsPerYearLimit: '0',
      otherFeatures: otherFeatures.map((value) => ({ value })),
    },
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(() => {
          if (serverError !== undefined) {
            setError('otherFeatures', { type: 'server', message: serverError });
          }
        })(event);
      }}
    >
      <OtherFeaturesField control={control} register={register} errors={errors.otherFeatures} />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup(otherFeatures: readonly string[] = [], serverError?: string) {
  const user = userEvent.setup();
  const view = render(<Harness otherFeatures={otherFeatures} serverError={serverError} />);
  return { ...view, user };
}

const element = (n: number) => screen.getByRole('textbox', { name: text.otherFeatureLabel(n) });
const elements = () => screen.queryAllByRole('textbox', { name: /^Funcionalidad \d+/ });
const addButton = () => screen.getByRole('button', { name: text.addOtherFeature });
const removeButton = (n: number) =>
  screen.getByRole('button', { name: text.removeOtherFeature(n) });

describe('OtherFeaturesField', () => {
  it('is a group with its legend, its help and how many elements it has', () => {
    setup(['Uno', 'Dos']);

    const group = screen.getByRole('group', { name: text.fields.otherFeatures });
    expect(within(group).getByText(text.otherFeaturesHelper)).toBeInTheDocument();
    expect(within(group).getByText(text.otherFeaturesCount(2))).toBeInTheDocument();
    expect(elements()).toHaveLength(2);
    expect(element(1)).toHaveValue('Uno');
    expect(element(2)).toHaveValue('Dos');
  });

  it('adds an element at the end, with the focus in it', async () => {
    const { user } = setup(['Uno']);

    await user.click(addButton());

    expect(elements()).toHaveLength(2);
    expect(element(2)).toHaveValue('');
    expect(element(2)).toHaveFocus();
    expect(screen.getByText(text.otherFeaturesCount(2))).toBeInTheDocument();
  });

  it('removes an element and moves the focus to the next one', async () => {
    const { user } = setup(['Uno', 'Dos', 'Tres']);

    await user.click(removeButton(2));

    expect(
      elements().map((input) => (input instanceof HTMLInputElement ? input.value : null)),
    ).toEqual(['Uno', 'Tres']);
    expect(element(2)).toHaveValue('Tres');
    expect(element(2)).toHaveFocus();
  });

  it('moves the focus to the one before when the last element is removed', async () => {
    const { user } = setup(['Uno', 'Dos']);

    await user.click(removeButton(2));

    expect(elements()).toHaveLength(1);
    expect(element(1)).toHaveFocus();
  });

  it('moves the focus to «Agregar funcionalidad» when no element is left', async () => {
    const { user } = setup(['Uno']);

    await user.click(removeButton(1));

    expect(elements()).toHaveLength(0);
    expect(addButton()).toHaveFocus();
    expect(screen.getByText(text.otherFeaturesCount(0))).toBeInTheDocument();
  });

  it('has no way to reorder the elements: they keep the order in which they were written', () => {
    setup(['Uno', 'Dos']);

    expect(
      screen.queryByRole('button', { name: /subir|bajar|mover|ordenar/i }),
    ).not.toBeInTheDocument();
  });

  it(`cannot add more than ${MAX_OTHER_FEATURES} elements, and says so; removing one lets it add again`, async () => {
    const twenty = Array.from({ length: 20 }, (_, index) => `Elemento ${index + 1}`);
    const { user } = setup(twenty);

    expect(addButton()).toBeDisabled();
    expect(screen.getByText(text.otherFeaturesMax)).toBeInTheDocument();
    expect(screen.getByText(text.otherFeaturesCount(20))).toBeInTheDocument();

    await user.click(removeButton(20));

    expect(addButton()).toBeEnabled();
    expect(screen.queryByText(text.otherFeaturesMax)).not.toBeInTheDocument();
  });

  it('puts the error of an element next to it', async () => {
    const { user } = setup(['Uno', '']);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(element(2)).toHaveAccessibleDescription(
      messages.subscriptions.validation.otherFeatureRequired,
    );
    expect(element(2)).toHaveAttribute('aria-invalid', 'true');
    expect(element(1)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the error of the whole list above it', async () => {
    const { user } = setup(['Uno'], messages.subscriptions.errors.fields.otherFeatures);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    const error = await screen.findByText(messages.subscriptions.errors.fields.otherFeatures);
    expect(
      error.compareDocumentPosition(element(1)) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole('group', { name: text.fields.otherFeatures }),
    ).toHaveAccessibleDescription(new RegExp(messages.subscriptions.errors.fields.otherFeatures));
  });

  it('has no accessibility violations, with elements and with errors', async () => {
    const { container, user } = setup(['Uno', '']);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
