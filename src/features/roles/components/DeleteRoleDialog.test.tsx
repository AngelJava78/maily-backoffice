import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import { DeleteRoleDialog } from './DeleteRoleDialog';

const text = messages.roles.delete;
const ROLE_NAME = 'Billing';

function renderDialog(props: Partial<ComponentProps<typeof DeleteRoleDialog>> = {}) {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  const user = userEvent.setup();
  const view = render(
    <DeleteRoleDialog
      open
      roleName={ROLE_NAME}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { ...view, user, onConfirm, onCancel };
}

describe('DeleteRoleDialog', () => {
  it('names the role in the title and warns that it cannot be undone (FR-015)', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: text.confirmTitle(ROLE_NAME) });
    expect(dialog).toHaveAccessibleDescription(text.confirmBody);
  });

  it('confirms the deletion of this role', async () => {
    const { user, onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: text.confirm }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('closes without deleting anything when cancelled', async () => {
    const { user, onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: text.cancel }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both actions while the deletion is pending', () => {
    renderDialog({ pending: true });

    expect(screen.getByRole('button', { name: text.cancel })).toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(text.confirm) })).toBeDisabled();
  });
});
