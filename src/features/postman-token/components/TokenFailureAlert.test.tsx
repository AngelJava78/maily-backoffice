import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { TokenFailureKind } from '../api/tokenFailure';
import { TokenFailureAlert } from './TokenFailureAlert';

const text = messages.token;

const CASES = [
  ['session-expired', text.errors.sessionExpired],
  ['unreadable-token', text.errors.unreadableToken],
  ['unknown', text.errors.unknown],
] as const;

function renderAlert(kind: TokenFailureKind) {
  const onRetry = vi.fn<() => void>();
  const onSignInAgain = vi.fn<() => void>();
  const view = render(
    <TokenFailureAlert kind={kind} onRetry={onRetry} onSignInAgain={onSignInAgain} />,
  );
  return { ...view, onRetry, onSignInAgain, user: userEvent.setup() };
}

describe('TokenFailureAlert', () => {
  it.each(CASES)(
    'says what happened when the failure is %s, with its own title and message',
    (kind, copy) => {
      renderAlert(kind);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(copy.title);
      expect(alert).toHaveTextContent(copy.message);
    },
  );

  it.each(CASES)('always offers "Reintentar" (%s)', async (kind) => {
    const { user, onRetry } = renderAlert(kind);

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers "Iniciar sesión de nuevo" only when the session ended, and calls onSignInAgain', async () => {
    const ended = renderAlert('session-expired');
    await ended.user.click(screen.getByRole('button', { name: text.actions.signInAgain }));
    expect(ended.onSignInAgain).toHaveBeenCalledOnce();
    ended.unmount();

    for (const kind of ['unreadable-token', 'unknown'] as const) {
      const other = renderAlert(kind);
      expect(
        screen.queryByRole('button', { name: text.actions.signInAgain }),
      ).not.toBeInTheDocument();
      other.unmount();
    }
  });

  it('shows no technical text (FR-019)', () => {
    renderAlert('unknown');

    expect(screen.getByRole('alert')).not.toHaveTextContent(/error|exception|undefined|\{/i);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAlert('session-expired');

    expect(await axe(container)).toHaveNoViolations();
  });
});
