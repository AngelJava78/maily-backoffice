import { fireEvent, screen } from '@testing-library/react';
import type { SyntheticEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { FormFrame } from './FormFrame';

function renderForm(props: Partial<Parameters<typeof FormFrame>[0]> = {}) {
  const onSubmit = vi.fn<(event: SyntheticEvent) => void>((event) => {
    event.preventDefault();
  });
  const view = renderWithProviders(
    <FormFrame onSubmit={onSubmit} pending={false} cancelTo="/users" {...props}>
      <label>
        Campo
        <input />
      </label>
    </FormFrame>,
  );
  return { ...view, onSubmit };
}

describe('FormFrame', () => {
  it('shows what it is given and the actions to save and to cancel', () => {
    renderForm();

    expect(screen.getByLabelText('Campo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.save })).toBeEnabled();
    expect(screen.getByRole('link', { name: messages.common.cancel })).toHaveAttribute(
      'href',
      '/users',
    );
  });

  it('leaves the validation to the form library: the browser does not validate', () => {
    const { container } = renderForm();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('sends the form when it is saved', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: messages.common.save }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows a general error as an alert, and none otherwise', () => {
    const { unmount } = renderForm();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    renderForm({ error: 'No se pudo crear la cuenta de acceso.' });

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo crear la cuenta de acceso.');
  });

  it('takes the focus to the general error, so it is seen and read', () => {
    renderForm({ error: 'Hay datos no válidos en el formulario.' });

    expect(screen.getByRole('alert')).toHaveFocus();
  });

  it('cannot be saved again while it is saving (FR-007)', () => {
    const { onSubmit } = renderForm({ pending: true });
    const save = screen.getByRole('button', { name: new RegExp(messages.common.save) });

    expect(save).toBeDisabled();
    // A real click cannot reach a button that is loading; the event is sent anyway to prove that
    // nothing is saved.
    fireEvent.click(save);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('can be kept from saving for another reason, such as the catalog that did not load', () => {
    renderForm({ saveDisabled: true });

    expect(screen.getByRole('button', { name: messages.common.save })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderForm({ error: 'Error general.' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
