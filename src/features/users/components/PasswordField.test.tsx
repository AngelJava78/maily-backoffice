import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { PasswordField } from './PasswordField';

function Harness({ error }: { readonly error?: string }) {
  const { register } = useForm({ defaultValues: { password: '' } });
  return <PasswordField registration={register('password')} error={error} />;
}

function setup(error?: string) {
  const user = userEvent.setup();
  const view = render(<Harness error={error} />);
  return { ...view, user };
}

const field = () => screen.getByLabelText(new RegExp(messages.users.form.fields.password));

describe('PasswordField', () => {
  it('is a password input labelled "Contraseña inicial" that the browser does not fill in for the operator', () => {
    setup();

    expect(field()).toHaveAttribute('type', 'password');
    expect(field()).toHaveAttribute('autocomplete', 'new-password');
  });

  it('explains what the password has to meet and that it is not shown again', () => {
    setup();

    expect(field()).toHaveAccessibleDescription(messages.users.form.passwordHelper);
  });

  it('shows the password when asked, keeping what was typed, and hides it again', async () => {
    const { user } = setup();
    await user.type(field(), 'Segura-123');

    await user.click(screen.getByRole('button', { name: messages.users.form.showPassword }));
    expect(field()).toHaveAttribute('type', 'text');
    expect(field()).toHaveValue('Segura-123');

    await user.click(screen.getByRole('button', { name: messages.users.form.hidePassword }));
    expect(field()).toHaveAttribute('type', 'password');
    expect(field()).toHaveValue('Segura-123');
  });

  it('is hidden by default', () => {
    setup();

    expect(
      screen.getByRole('button', { name: messages.users.form.showPassword }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: messages.users.form.hidePassword }),
    ).not.toBeInTheDocument();
  });

  it('ties an error to the field', () => {
    setup(messages.users.validation.passwordRequired);

    expect(field()).toBeInvalid();
    expect(field()).toHaveAccessibleDescription(messages.users.validation.passwordRequired);
  });

  it('has no accessibility violations, with and without an error', async () => {
    const quiet = setup();
    expect(await axe(quiet.container)).toHaveNoViolations();
    quiet.unmount();

    const failing = setup(messages.users.validation.passwordRequired);
    expect(await axe(failing.container)).toHaveNoViolations();
  });
});
