import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { renderWithProviders } from '@/test/renderWithProviders';

import { DashboardSummary } from './DashboardSummary';

const text = messages.dashboard;

/**
 * A failure that is not retried (FR-027), so these tests do not wait for the retries: what is drawn
 * is the same for every failure.
 */
const REJECTED = [422, 'validation_error'] as const;

function renderSummary() {
  return renderWithProviders(<DashboardSummary refreshIntervalMs={300_000} />);
}

/** The value next to a label of the list of indicators. */
function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement) || value.tagName !== 'DD') {
    throw new Error(`There is no value for ${label}`);
  }
  return value;
}

async function untilShown(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.indicatorsTitle });
}

describe('DashboardSummary', () => {
  it('shows the load while the summary has not arrived yet', async () => {
    createPlatformDashboardMock();
    const { container } = renderSummary();

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await untilShown();
  });

  it('shows the indicators, the recent clinics and when it was updated', async () => {
    createPlatformDashboardMock();
    renderSummary();
    await untilShown();

    expect(valueOf(text.indicators.totalPatients)).toHaveTextContent('1,284');
    expect(
      screen.getByRole('heading', { level: 2, name: text.recentClinics.title }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: text.recentClinics.title })).getAllByRole('row'),
    ).toHaveLength(6);
    expect(screen.getByText((content) => content.startsWith(text.lastUpdated('')))).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers no action and no link: the Panel is read only (FR-010)', async () => {
    createPlatformDashboardMock();
    renderSummary();
    await untilShown();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says «No disponible» for each datum whose source failed (FR-007)', async () => {
    createPlatformDashboardMock().setUnavailable('total_doctors', 'recent_clinics');
    renderSummary();
    await untilShown();

    expect(valueOf(text.indicators.totalDoctors)).toHaveTextContent(text.notAvailable);
    expect(valueOf(text.indicators.totalUsers)).toHaveTextContent('52');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByText(text.notAvailable)).toHaveLength(2);
  });

  it('says that there are no clinics when the list is empty (FR-008)', async () => {
    createPlatformDashboardMock().setRecentClinics([]);
    renderSummary();
    await untilShown();

    expect(screen.getByText(text.recentClinics.empty)).toBeInTheDocument();
  });

  it('tells the person that they may not see the indicators when the service refuses them (FR-015)', async () => {
    createPlatformDashboardMock().failNext({ status: 403, code: 'permission_denied' });
    renderSummary();

    expect(await screen.findByRole('alert')).toHaveTextContent(text.noPermission.title);
    expect(screen.queryByRole('heading', { name: text.indicatorsTitle })).not.toBeInTheDocument();
    expect(screen.queryByRole('term')).not.toBeInTheDocument();
  });

  it('has no accessibility violations with the data on screen', async () => {
    createPlatformDashboardMock().setUnavailable('total_users');
    const { container } = renderSummary();
    await untilShown();

    expect(await axe(container)).toHaveNoViolations();
  });

  // User story 4: a failure never empties the Panel, and the next cycle tries again by itself.
  describe('when a query fails', () => {
    it('says that the indicators could not be loaded the first time, without offering to retry (FR-025)', async () => {
      createPlatformDashboardMock().failAll(...REJECTED);
      const { container } = renderSummary();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text.loadError.title);
      expect(alert).toHaveTextContent(text.loadError.message);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('term')).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('keeps the data and its time when a refresh fails, and says so above them (FR-024)', async () => {
      const platform = createPlatformDashboardMock();
      const { container, queryClient } = renderSummary();
      await untilShown();
      const lastUpdated = screen.getByText((content) =>
        content.startsWith(text.lastUpdated('')),
      ).textContent;

      platform.failAll(...REJECTED);
      await act(() => queryClient.refetchQueries());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text.refreshFailed);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(valueOf(text.indicators.totalPatients)).toHaveTextContent('1,284');
      expect(
        screen.getByText((content) => content.startsWith(text.lastUpdated(''))),
      ).toHaveTextContent(lastUpdated);
      // Above the summary: it is read before the data it speaks of.
      expect(
        alert.compareDocumentPosition(
          screen.getByRole('heading', { level: 2, name: text.indicatorsTitle }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('does not announce the failure again while the next cycle is on its way, and drops it once one works (FR-026, FR-034)', async () => {
      const platform = createPlatformDashboardMock();
      const { queryClient } = renderSummary();
      await untilShown();
      platform.failAll(...REJECTED);
      await act(() => queryClient.refetchQueries());
      const alert = await screen.findByRole('alert');

      platform.recover();
      const release = platform.defer();
      act(() => {
        void queryClient.refetchQueries();
      });

      expect(await screen.findByText(text.updating)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBe(alert);
      release();
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });
});
