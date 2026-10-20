import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HomePage } from './HomePage';

function accessWith(...permissions: string[]) {
  return operatorAccess({ permissions: new Set(permissions) });
}

function renderHome(...permissions: string[]) {
  return renderWithProviders(<HomePage dashboardRefreshMs={300_000} />, {
    access: accessWith(...permissions),
  });
}

describe('HomePage', () => {
  it('is the Panel: its heading names it and gets the focus, and the greeting follows it (FR-001, FR-003)', () => {
    renderHome('tenants:read');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(messages.home.title);
    expect(heading).toHaveFocus();
    const greeting = screen.getByText(messages.home.greeting('Ana Pérez'));
    expect(greeting.tagName).toBe('P');
    expect(
      screen.queryByRole('heading', { name: messages.home.greeting('Ana Pérez') }),
    ).not.toBeInTheDocument();
  });

  it('shows the indicators to whoever has dashboard:read (FR-004)', async () => {
    createPlatformDashboardMock();
    renderHome('dashboard:read', 'users:read');

    expect(
      await screen.findByRole('heading', { level: 2, name: messages.dashboard.indicatorsTitle }),
    ).toBeInTheDocument();
  });

  it('does not mount the summary without dashboard:read, so nothing is asked for', async () => {
    const platform = createPlatformDashboardMock();
    renderHome('users:read');
    await screen.findByRole('heading', { level: 1, name: messages.home.title });

    expect(
      screen.queryByRole('heading', { name: messages.dashboard.indicatorsTitle }),
    ).not.toBeInTheDocument();
    expect(platform.requestCount).toBe(0);
  });

  it('tells a person without permissions that their role has none yet (US1-6 of feature 001)', () => {
    renderHome();

    expect(screen.getByRole('alert')).toHaveTextContent(messages.home.noPermissionsTitle);
    expect(screen.getByRole('alert')).toHaveTextContent(messages.home.noPermissionsNotice);
  });

  it('shows that notice when the only permissions cannot open anything', () => {
    renderHome('users:write', 'roles:read');

    expect(screen.getByText(messages.home.noPermissionsTitle)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHome();

    expect(await axe(container)).toHaveNoViolations();
  });

  // The three cases of data-model.md («Página principal»): the summary, its own notice, or the
  // notice of "no permissions assigned".
  describe('according to the permissions (user story 2)', () => {
    it('tells whoever can see other things, but not the indicators, that they may not see them (FR-011)', async () => {
      const platform = createPlatformDashboardMock();
      renderHome('users:read');

      expect(screen.getByText(messages.home.greeting('Ana Pérez'))).toBeInTheDocument();
      expect(screen.getByText(messages.dashboard.noPermission.title)).toBeInTheDocument();
      expect(screen.getByText(messages.dashboard.noPermission.message)).toBeInTheDocument();
      expect(screen.queryByText(messages.home.noPermissionsTitle)).not.toBeInTheDocument();
      await screen.findByRole('heading', { level: 1, name: messages.home.title });
      expect(platform.requestCount).toBe(0);
    });

    it('tells whoever has no permission at all only that their role has none yet (FR-012)', async () => {
      const platform = createPlatformDashboardMock();
      renderHome();

      expect(screen.getByText(messages.home.noPermissionsTitle)).toBeInTheDocument();
      expect(screen.queryByText(messages.dashboard.noPermission.title)).not.toBeInTheDocument();
      await screen.findByRole('heading', { level: 1, name: messages.home.title });
      expect(platform.requestCount).toBe(0);
    });

    it('shows the indicators, and no notice, to whoever only has dashboard:read (FR-012)', async () => {
      createPlatformDashboardMock();
      renderHome('dashboard:read');

      expect(
        await screen.findByRole('heading', { level: 2, name: messages.dashboard.indicatorsTitle }),
      ).toBeInTheDocument();
      expect(screen.queryByText(messages.home.noPermissionsTitle)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.dashboard.noPermission.title)).not.toBeInTheDocument();
    });

    it('has no accessibility violations with the notice of the indicators', async () => {
      const { container } = renderHome('users:read');

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
