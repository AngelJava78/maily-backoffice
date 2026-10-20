import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { fakeAccessToken, FAKE_TOKEN_EXP } from '@/test/accessToken';

import type { IssuedToken } from '../schemas/accessToken';
import { TokenValue } from './TokenValue';

const text = messages.token;
const VALUE = fakeAccessToken({ exp: FAKE_TOKEN_EXP });
const TOKEN: IssuedToken = { value: VALUE, expiresAt: '2030-03-17T17:46:40.000Z' };

type Props = ComponentProps<typeof TokenValue>;

function renderValue(props: Partial<Props> = {}) {
  const onToggleReveal = vi.fn<() => void>();
  const onCopy = vi.fn<() => void>();
  const view = render(
    <TokenValue
      token={TOKEN}
      revealed={false}
      canCopy
      onToggleReveal={onToggleReveal}
      onCopy={onCopy}
      {...props}
    />,
  );
  return { ...view, onToggleReveal, onCopy, user: userEvent.setup() };
}

const field = () => screen.getByRole('textbox', { name: text.fields.token });
const getButton = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });

describe('TokenValue', () => {
  it('without a token shows an empty read-only field with its help and no buttons (FR-009)', () => {
    renderValue({ token: null, canCopy: false });

    expect(field()).toHaveValue('');
    expect(field()).toHaveAttribute('readonly');
    expect(screen.getByText(text.emptyToken)).toBeInTheDocument();
    expect(queryButton(text.actions.show)).not.toBeInTheDocument();
    expect(queryButton(text.actions.hide)).not.toBeInTheDocument();
    expect(queryButton(text.actions.copy)).not.toBeInTheDocument();
  });

  it('hides the token: the field holds a mask and the text of the token is nowhere in the page (FR-010)', () => {
    const { container } = renderValue();

    expect(field()).toHaveValue(text.mask);
    expect(container).not.toHaveTextContent(VALUE);
    expect(container.innerHTML).not.toContain(VALUE);
    expect(screen.queryByDisplayValue(VALUE)).not.toBeInTheDocument();
    expect(getButton(text.actions.show)).toBeInTheDocument();
    expect(queryButton(text.actions.hide)).not.toBeInTheDocument();
  });

  it('uses the same mask whatever the length of the token', () => {
    const long = fakeAccessToken({ exp: FAKE_TOKEN_EXP, padding: 'x'.repeat(2000) });

    renderValue({ token: { value: long, expiresAt: TOKEN.expiresAt } });

    expect(field()).toHaveValue(text.mask);
  });

  it('shows the whole token when it is revealed, even a very long one', () => {
    const long = fakeAccessToken({ exp: FAKE_TOKEN_EXP, padding: 'x'.repeat(2000) });

    renderValue({ token: { value: long, expiresAt: TOKEN.expiresAt }, revealed: true });

    expect(field()).toHaveValue(long);
    expect(getButton(text.actions.hide)).toBeInTheDocument();
    expect(queryButton(text.actions.show)).not.toBeInTheDocument();
  });

  it('asks to show the hidden token when its button is pressed', async () => {
    const { user, onToggleReveal } = renderValue();

    await user.click(getButton(text.actions.show));

    expect(onToggleReveal).toHaveBeenCalledOnce();
  });

  it('asks to hide the visible token when its button is pressed', async () => {
    const { user, onToggleReveal } = renderValue({ revealed: true });

    await user.click(getButton(text.actions.hide));

    expect(onToggleReveal).toHaveBeenCalledOnce();
  });

  it('offers "Copiar" when the token can be copied, hidden or not, and calls onCopy (FR-011)', async () => {
    const hidden = renderValue();
    await hidden.user.click(getButton(text.actions.copy));
    expect(hidden.onCopy).toHaveBeenCalledOnce();
    hidden.unmount();

    const shown = renderValue({ revealed: true });
    expect(getButton(text.actions.copy)).toBeInTheDocument();
    shown.unmount();
  });

  it('does not offer "Copiar" when the token cannot be copied', () => {
    renderValue({ canCopy: false });

    expect(queryButton(text.actions.copy)).not.toBeInTheDocument();
    expect(getButton(text.actions.show)).toBeInTheDocument();
  });

  it('keeps the browser from completing or correcting the field (research D11)', () => {
    renderValue({ revealed: true });

    expect(field()).toHaveAttribute('autocomplete', 'off');
    expect(field()).toHaveAttribute('spellcheck', 'false');
  });

  it('has no accessibility violations in any of its states', async () => {
    const empty = renderValue({ token: null, canCopy: false });
    expect(await axe(empty.container)).toHaveNoViolations();
    empty.unmount();

    const hidden = renderValue();
    expect(await axe(hidden.container)).toHaveNoViolations();
    hidden.unmount();

    const shown = renderValue({ revealed: true });
    expect(await axe(shown.container)).toHaveNoViolations();
  });
});
