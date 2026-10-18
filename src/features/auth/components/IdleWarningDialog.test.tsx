import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { IdleWarningDialog } from './IdleWarningDialog';

afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(open = true) {
  vi.useFakeTimers();
  const deadline = Date.now() + 60_000;
  const getRemainingTimeMs = () => Math.max(0, deadline - Date.now());
  const onContinue = vi.fn<() => void>();
  const onLogout = vi.fn<() => void>();
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  const view = render(
    <IdleWarningDialog
      open={open}
      getRemainingTimeMs={getRemainingTimeMs}
      onContinue={onContinue}
      onLogout={onLogout}
    />,
  );
  return { ...view, user, onContinue, onLogout };
}

describe('IdleWarningDialog', () => {
  it('warns that the session is about to close, as an alert dialog', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: messages.idleDialog.title });
    expect(dialog).toHaveTextContent(messages.idleDialog.body(60));
  });

  it('counts down every second', () => {
    renderDialog();

    expect(screen.getByRole('alertdialog')).toHaveTextContent(messages.idleDialog.body(60));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('alertdialog')).toHaveTextContent(messages.idleDialog.body(59));
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByRole('alertdialog')).toHaveTextContent(messages.idleDialog.body(55));
  });

  it('renders nothing while the session is not about to close', () => {
    renderDialog(false);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the session when the person chooses to continue', async () => {
    const { user, onContinue, onLogout } = renderDialog();

    await user.click(screen.getByRole('button', { name: messages.idleDialog.continue }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('ends the session when the person chooses to log out', async () => {
    const { user, onContinue, onLogout } = renderDialog();

    await user.click(screen.getByRole('button', { name: messages.common.logout }));

    expect(onLogout).toHaveBeenCalledOnce();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('is operated with the keyboard: the focus starts on continue, stays inside and Escape continues', async () => {
    const { user, onContinue } = renderDialog();
    const continueButton = screen.getByRole('button', { name: messages.idleDialog.continue });
    const logoutButton = screen.getByRole('button', { name: messages.common.logout });
    expect(continueButton).toHaveFocus();

    await user.tab();
    expect(logoutButton).toHaveFocus();
    await user.tab();
    expect(continueButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { baseElement } = render(
      <IdleWarningDialog
        open
        getRemainingTimeMs={() => 60_000}
        onContinue={() => undefined}
        onLogout={() => undefined}
      />,
    );

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
