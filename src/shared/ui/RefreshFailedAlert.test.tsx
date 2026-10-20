import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { RefreshFailedAlert } from './RefreshFailedAlert';

describe('RefreshFailedAlert', () => {
  it('says that the information could not be updated and offers to try again', async () => {
    const onRetry = vi.fn<() => void>();
    render(<RefreshFailedAlert message={messages.users.detail.refreshError} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent(messages.users.detail.refreshError);
    await userEvent.setup().click(screen.getByRole('button', { name: messages.common.retry }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RefreshFailedAlert message={messages.users.roles.refreshError} onRetry={() => undefined} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
