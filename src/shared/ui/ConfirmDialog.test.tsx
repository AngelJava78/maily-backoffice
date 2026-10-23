import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { ConfirmDialog } from './ConfirmDialog';

const TITLE = 'Bloquear usuario';
const MESSAGE = 'Ana Pérez no podrá iniciar sesión mientras esté bloqueada.';
const CONFIRM = 'Bloquear';

function renderDialog(props: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  const user = userEvent.setup();
  const view = render(
    <ConfirmDialog
      open
      title={TITLE}
      message={MESSAGE}
      confirmLabel={CONFIRM}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { ...view, user, onConfirm, onCancel };
}

/** The element that receives the click on the area around the dialog (the "outside"). */
function outsideOf(dialog: HTMLElement): HTMLElement {
  const container = dialog.parentElement;
  if (container === null) {
    throw new Error('The dialog has no container to click on');
  }
  return container;
}

describe('ConfirmDialog', () => {
  it('shows a dialog named by its title and described by the message that names the user', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toHaveAccessibleDescription(MESSAGE);
  });

  it('renders nothing while it is closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts with the focus on "Cancelar", the safe action', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: messages.common.cancel })).toHaveFocus();
  });

  it('confirms once', async () => {
    const { user, onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: CONFIRM }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with the button, with Escape and by clicking outside', async () => {
    const { user, onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: messages.common.cancel }));
    await user.keyboard('{Escape}');
    await user.click(outsideOf(screen.getByRole('dialog')));

    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the focus inside while it is open', async () => {
    const { user } = renderDialog();
    const cancel = screen.getByRole('button', { name: messages.common.cancel });
    const confirm = screen.getByRole('button', { name: CONFIRM });

    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
  });

  describe('while the action is pending', () => {
    it('disables both buttons and shows that it is working', () => {
      renderDialog({ pending: true });

      expect(screen.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
      expect(screen.getByRole('button', { name: new RegExp(CONFIRM) })).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not close with Escape or by clicking outside', async () => {
      const { user, onCancel } = renderDialog({ pending: true });

      await user.keyboard('{Escape}');
      await user.click(outsideOf(screen.getByRole('dialog')));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  it('gives the focus back to the button that opened it', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Abrir
          </button>
          <ConfirmDialog
            open={open}
            title={TITLE}
            message={MESSAGE}
            confirmLabel={CONFIRM}
            onConfirm={() => {
              setOpen(false);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: messages.common.cancel }));

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('names the safe action "Cancelar" by default, or `cancelLabel` when given', () => {
    renderDialog({ cancelLabel: 'Quedarme' });

    expect(screen.getByRole('button', { name: 'Quedarme' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: messages.common.cancel })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { baseElement } = renderDialog();

    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('has none either while it is working', async () => {
    const { baseElement } = renderDialog({ pending: true });

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
