import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { editUserFormSchema, type EditUserFormValues } from '../schemas/userForm';
import { UserNameFields } from './UserNameFields';

function Harness() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { firstName: '', paternalLastName: '', maternalLastName: '' },
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(() => undefined)(event);
      }}
    >
      <UserNameFields
        firstName={register('firstName')}
        paternalLastName={register('paternalLastName')}
        maternalLastName={register('maternalLastName')}
        errors={{
          firstName: errors.firstName?.message,
          paternalLastName: errors.paternalLastName?.message,
          maternalLastName: errors.maternalLastName?.message,
        }}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = render(<Harness />);
  return { ...view, user };
}

const labels = messages.users.form.fields;
const firstName = () => screen.getByLabelText(new RegExp(`^${labels.firstName}`));
const paternal = () => screen.getByLabelText(new RegExp(`^${labels.paternalLastName}`));
const maternal = () => screen.getByLabelText(new RegExp(`^${labels.maternalLastName}`));

describe('UserNameFields', () => {
  it('has the three fields, the first two marked as required', () => {
    setup();

    expect(firstName()).toBeRequired();
    expect(paternal()).toBeRequired();
    expect(maternal()).not.toBeRequired();
  });

  it('writes into the form it is given', async () => {
    const { user } = setup();

    await user.type(firstName(), 'Ana');

    expect(firstName()).toHaveValue('Ana');
  });

  it('shows the error of a field and marks it as invalid', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      await screen.findByText(messages.users.validation.firstNameRequired),
    ).toBeInTheDocument();
    expect(firstName()).toBeInvalid();
    expect(firstName()).toHaveAccessibleDescription(messages.users.validation.firstNameRequired);
    expect(paternal()).toBeInvalid();
    expect(maternal()).toBeValid();
  });

  it('puts the focus on the first field with an error when the form is sent', async () => {
    const { user } = setup();
    await user.type(firstName(), 'Ana');

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await screen.findByText(messages.users.validation.paternalLastNameRequired);
    expect(paternal()).toHaveFocus();
  });

  it('has no accessibility violations, with and without errors', async () => {
    const { user, container } = setup();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText(messages.users.validation.firstNameRequired);

    expect(await axe(container)).toHaveNoViolations();
  });
});
