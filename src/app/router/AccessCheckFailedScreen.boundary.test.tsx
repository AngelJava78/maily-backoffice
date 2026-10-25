import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AccessCheckFailedScreen } from './AccessCheckFailedScreen';

// The sections fail to render, as a part of the application that cannot load would.
vi.mock('@/features/health', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/health')>()),
  AccessCheckFallback: () => {
    throw new Error('The sections could not be drawn');
  },
}));

describe('AccessCheckFailedScreen when its sections fail', () => {
  it('says the status could not be obtained, and the rest of the screen keeps working (FR-060)', async () => {
    // React reports the error that the boundary caught through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refetch = vi.fn<() => void>();
    const { user } = renderWithProviders(
      <AccessCheckFailedScreen
        access={{ status: 'failed', refetch, accountEmail: null, isChecking: false }}
      />,
    );

    expect(await screen.findByText(messages.health.platform.failed)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: messages.health.platform.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: messages.common.logout })).toBeEnabled();
  });
});
