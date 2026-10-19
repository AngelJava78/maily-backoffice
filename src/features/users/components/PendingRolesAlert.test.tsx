import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { PendingRolesAlert } from './PendingRolesAlert';

const PENDING = [
  { id: 6, name: 'Doctor' },
  { id: 9, name: 'Support' },
];

function setup(pending = false) {
  const onRetry = vi.fn<() => void>();
  const onDismiss = vi.fn<() => void>();
  const user = userEvent.setup();
  const view = render(
    <PendingRolesAlert roles={PENDING} pending={pending} onRetry={onRetry} onDismiss={onDismiss} />,
  );
  return { ...view, user, onRetry, onDismiss };
}

describe('PendingRolesAlert', () => {
  it('warns that roles are missing and names them', () => {
    setup();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(messages.users.pendingRoles.title);
    expect(alert).toHaveTextContent(messages.users.pendingRoles.message('Doctor, Support'));
  });

  it('offers to retry the assignment', async () => {
    const { user, onRetry } = setup();

    await user.click(screen.getByRole('button', { name: messages.users.pendingRoles.retry }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('cannot retry again while it is retrying', () => {
    setup(true);

    expect(
      screen.getByRole('button', { name: new RegExp(messages.users.pendingRoles.retry) }),
    ).toBeDisabled();
  });

  it('can be dismissed', async () => {
    const { user, onDismiss } = setup();

    await user.click(screen.getByRole('button', { name: messages.users.pendingRoles.dismiss }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();

    expect(await axe(container)).toHaveNoViolations();
  });
});
