import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AccessCheckFailedScreen } from './AccessCheckFailedScreen';

const text = messages.health.platform;

/** The screen with an access that failed and a `refetch` that tests watch. */
function renderScreen({ isChecking = false }: { readonly isChecking?: boolean } = {}) {
  const refetch = vi.fn<() => void>();
  const view = renderWithProviders(
    <AccessCheckFailedScreen
      access={{ status: 'failed', refetch, accountEmail: 'ana@mailysoft.test', isChecking }}
    />,
  );
  return { ...view, refetch };
}

describe('AccessCheckFailedScreen', () => {
  // First, while no test of this file has loaded the part of the application of the sections.
  it('shows the placeholder of the section while its part of the application loads', () => {
    createHealthMonitoringMock();
    renderScreen();

    const section = screen.getByRole('region', { name: text.title });
    expect(within(section).getByText(text.loading)).toBeInTheDocument();
  });

  it('keeps the screen of feature 001 and adds the status of the platform below it (US5-1)', async () => {
    createHealthMonitoringMock();
    renderScreen();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.logout })).toBeInTheDocument();
    expect(screen.getByText(messages.common.account('ana@mailysoft.test'))).toBeInTheDocument();
    expect(await screen.findByText('Todo operativo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
  });

  it('asks nothing while the access is being checked (FR-065)', async () => {
    const health = createHealthMonitoringMock();
    renderScreen({ isChecking: true });

    await screen.findByRole('heading', { level: 1, name: messages.checkFailed.title });
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(health.requestsTo('GET', '/health/status')).toHaveLength(0);
  });

  it('starts a new round with «Reintentar», which asks the access again', async () => {
    const health = createHealthMonitoringMock();
    const { user, refetch } = renderScreen();
    await screen.findByText('Todo operativo');

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(refetch).toHaveBeenCalledOnce();
    // The check has not started yet in this double, so the new round waits for it.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(health.requestsTo('GET', '/health/status')).toHaveLength(1);
    await waitFor(() => {
      expect(screen.getByText('Todo operativo')).toBeInTheDocument();
    });
  });
});
