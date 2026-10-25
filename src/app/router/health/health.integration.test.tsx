import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { ADMIN_ID } from '@/test/handlers/usersDirectory/seed';
import { renderApp } from '@/test/renderApp';

// The page is a lazy chunk: load it here so that no test pays for it while it waits.
beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/health'),
    import('@/features/health/pages/HealthPage'),
    import('@/features/home'),
    import('@/features/users'),
  ]);
}, 90_000);

const text = messages.health;
const HEALTH_PATH = '/api/v1/health';

/**
 * The service with the default directory, whose operator is an Administrator without `health:*`
 * (feature 016 grants nothing by default), and the aggregator that asks that directory.
 */
function start({
  grant = [],
  roleIds,
}: { readonly grant?: readonly string[]; readonly roleIds?: readonly number[] } = {}) {
  const base = defaultDirectory();
  const directory = createUsersDirectoryMock(
    roleIds === undefined
      ? base
      : { ...base, associations: roleIds.map((roleId) => ({ userId: ADMIN_ID, roleId })) },
  );
  for (const permission of grant) {
    directory.grant('Administrator', permission);
  }
  const health = createHealthMonitoringMock({ directory });
  return { directory, health, askedFor: () => health.requestsTo('GET', HEALTH_PATH).length };
}

function open(url = '/') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const navigation = () => screen.getByRole('navigation', { name: messages.nav.label });
const healthLink = () =>
  within(navigation()).queryByRole('link', { name: messages.nav.sections.health });
const pageHeading = () => screen.queryByRole('heading', { level: 1, name: text.page.title });

/** A few real turns of the event loop, to see that nothing else was asked for. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

describe(
  '«Salud de servicios»: the entry, the page and its permission (user story 1)',
  {
    timeout: 30_000,
  },
  () => {
    it('is listed after Suscripciones and before Token, and opens the page (FR-003)', async () => {
      start({ grant: ['health:read', 'token:read'] });
      const { user, router } = open();
      await screen.findByRole('navigation', { name: messages.nav.label });

      const names = within(navigation())
        .getAllByRole('link')
        .map((link) => link.textContent);
      const at = (name: string) => names.findIndex((candidate) => candidate.includes(name));
      expect(at(messages.nav.sections.health)).toBe(at(messages.nav.sections.subscriptions) + 1);
      expect(at(messages.nav.sections.token)).toBe(at(messages.nav.sections.health) + 1);

      const link = healthLink();
      if (link === null) {
        throw new Error('Expected the entry of «Salud de servicios»');
      }
      await user.click(link);

      expect(router.state.location.pathname).toBe('/health');
      expect(
        await screen.findByRole('heading', { level: 3, name: 'MailySoft System API' }),
      ).toBeInTheDocument();
      expect(document.title).toBe(`${text.page.title} — ${messages.common.appName}`);
      await waitFor(() => {
        expect(pageHeading()).toHaveFocus();
      });
    });

    it('is neither listed nor opened without health:read, and asks nothing (FR-002)', async () => {
      const { askedFor } = start();
      const { router } = open('/health');

      expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
      expect(healthLink()).not.toBeInTheDocument();
      expect(pageHeading()).not.toBeInTheDocument();
      await settle();
      expect(askedFor()).toBe(0);
    });

    it('does not count a health:read that only a role of type Clínica gives (feature 006)', async () => {
      const { directory, askedFor } = start({ roleIds: [1, 3] });
      directory.grant('Owner', 'health:read');
      open('/health');

      expect(await screen.findByText(messages.home.permissionsChanged)).toBeInTheDocument();
      expect(healthLink()).not.toBeInTheDocument();
      await settle();
      expect(askedFor()).toBe(0);
    });

    it('shows its own notice when the service refuses the permission, without the general one and keeping the session (FR-031)', async () => {
      const { directory, askedFor } = start({ grant: ['health:read'] });
      const { user, router, logout } = open();
      await screen.findByRole('navigation', { name: messages.nav.label });

      // Taken away in the service before the Backoffice checks the access again, which still has it.
      directory.revoke('Administrator', 'health:read');
      const link = healthLink();
      if (link === null) {
        throw new Error('Expected the entry of «Salud de servicios»');
      }
      await user.click(link);

      expect(await screen.findByText(text.page.noPermission)).toBeInTheDocument();
      expect(screen.queryByText(messages.forbidden.action)).not.toBeInTheDocument();
      await settle();
      expect(askedFor()).toBe(1);
      expect(router.state.location.pathname).toBe('/health');
      expect(logout).not.toHaveBeenCalled();
    });
  },
);

describe(
  '«Salud de servicios» when the aggregator fails: the status of the platform (user story 5)',
  { timeout: 30_000 },
  () => {
    const platform = text.platform;

    it('shows the section with the failure of the first load, and takes it away when the aggregator answers (US5-11)', async () => {
      const { health } = start({ grant: ['health:read'] });
      health.failAll(503, 'authorization_unavailable');
      const { user } = open('/health');

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text.page.loadError.title);
      const section = await screen.findByRole('region', { name: platform.title });
      expect(await within(section).findByText('Todo operativo')).toBeInTheDocument();
      // Announced once, politely, in its own region.
      await waitFor(() => {
        expect(within(section).getByRole('status')).toHaveTextContent(platform.title);
      });

      health.recover();
      await user.click(within(alert).getByRole('button', { name: messages.common.retry }));

      expect(
        await screen.findByRole('heading', { level: 2, name: text.page.componentsTitle }),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('region', { name: platform.title })).not.toBeInTheDocument();
      });
    });

    it('shows the section with the notice of a failed refresh, keeping the data', async () => {
      const { health } = start({ grant: ['health:read'] });
      const { user } = open('/health');
      await screen.findByRole('heading', { level: 2, name: text.page.componentsTitle });

      health.failAll(500);
      await user.click(screen.getByRole('button', { name: text.page.refresh }));

      expect(await screen.findByRole('alert')).toHaveTextContent(text.page.refreshFailed);
      expect(await screen.findByRole('region', { name: platform.title })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'MailySoft System API' })).toBeVisible();
    });

    it('never shows the section when the service refuses the permission (403)', async () => {
      const { directory, health } = start({ grant: ['health:read'] });
      const { user } = open();
      await screen.findByRole('navigation', { name: messages.nav.label });
      directory.revoke('Administrator', 'health:read');
      const link = healthLink();
      if (link === null) {
        throw new Error('Expected the entry of «Salud de servicios»');
      }

      await user.click(link);

      expect(await screen.findByText(text.page.noPermission)).toBeInTheDocument();
      await settle();
      expect(health.requestsTo('GET', '/health/status')).toHaveLength(0);
      expect(screen.queryByRole('region', { name: platform.title })).not.toBeInTheDocument();
    });
  },
);
