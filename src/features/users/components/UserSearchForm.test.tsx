import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { UserSearchForm } from './UserSearchForm';

function renderForm(initialEmail?: string) {
  const onSearch = vi.fn<(email: string) => void>();
  const onClear = vi.fn<() => void>();
  const user = userEvent.setup();
  const view = render(
    <UserSearchForm initialEmail={initialEmail} onSearch={onSearch} onClear={onClear} />,
  );
  return { ...view, user, onSearch, onClear };
}

const field = () => screen.getByLabelText(messages.users.search.label);
const submit = () => screen.getByRole('button', { name: messages.users.search.submit });

describe('UserSearchForm', () => {
  it('is a search form with a labelled field and a help text', () => {
    renderForm();

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(field()).toHaveAccessibleDescription(messages.users.search.helper);
  });

  it('searches with the email trimmed', async () => {
    const { user, onSearch } = renderForm();

    await user.type(field(), '  ana@clinica.com ');
    await user.click(submit());

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('ana@clinica.com');
  });

  it('searches with Enter too', async () => {
    const { user, onSearch } = renderForm();

    await user.type(field(), 'ana@clinica.com{Enter}');

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('ana@clinica.com');
  });

  it.each([
    ['nothing', '', messages.users.validation.emailRequired],
    ['only spaces', '   ', messages.users.validation.emailRequired],
    ['text that is not an email', 'no-es-correo', messages.users.validation.emailInvalid],
    [
      'more than 255 characters',
      `${'a'.repeat(250)}@clinica.com`,
      messages.users.validation.emailTooLong,
    ],
  ])(
    'does not search for %s: it shows the error next to the field and focuses it (FR-018)',
    async (_label, typed, error) => {
      const { user, onSearch } = renderForm();
      if (typed !== '') {
        // Pasted: typing 260 characters one by one would take longer than the test is allowed.
        await user.click(field());
        await user.paste(typed);
      }

      await user.click(submit());

      expect(await screen.findByText(error)).toBeInTheDocument();
      expect(field()).toHaveAccessibleDescription(error);
      expect(field()).toBeInvalid();
      expect(field()).toHaveFocus();
      expect(onSearch).not.toHaveBeenCalled();
    },
  );

  it('shows the email that is being searched and offers to clear the search', async () => {
    const { user, onClear } = renderForm('ana@clinica.com');

    expect(field()).toHaveValue('ana@clinica.com');
    await user.click(screen.getByRole('button', { name: messages.users.search.clear }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('offers no way to clear when nothing is being searched', () => {
    renderForm();

    expect(
      screen.queryByRole('button', { name: messages.users.search.clear }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations, with and without an error', async () => {
    const { user, container } = renderForm();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(submit());
    await screen.findByText(messages.users.validation.emailRequired);

    expect(await axe(container)).toHaveNoViolations();
  });
});
