import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { healthComponentDto, healthResultDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HealthPage } from './HealthPage';

const text = messages.health;

/** A result of six components, all up, in the order the aggregator gives them. */
const SIX_UP = healthResultDto({
  components: [
    ...healthResultDto().components,
    healthComponentDto({ code: 'mailysoft-usuarios', name: 'MailySoft Usuarios' }),
    healthComponentDto({ code: 'mailysoft-pacientes', name: 'MailySoft Pacientes' }),
    healthComponentDto({ code: 'mailysoft-agenda', name: 'MailySoft Agenda' }),
    healthComponentDto({ code: 'maily-web', name: 'Maily Web', kind: 'frontend', checks: [] }),
  ],
});

const BUILD = {
  version: '1.0.0',
  commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
  buildDate: '2026-10-24T16:05:00Z',
};

function renderPage() {
  return renderWithProviders(<HealthPage refreshMs={30_000} build={BUILD} />);
}

const buildBlock = () => screen.queryByRole('region', { name: messages.health.backoffice.title });

async function untilShown(): Promise<void> {
  await screen.findByRole('heading', { level: 2, name: text.page.componentsTitle });
}

function componentNames(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
}

describe('HealthPage', () => {
  it('shows the load, then the overall status and every component in the order received', async () => {
    const health = createHealthMonitoringMock();
    health.setResult(SIX_UP);
    const { container } = renderPage();

    const heading = screen.getByRole('heading', { level: 1, name: text.page.title });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await untilShown();

    expect(screen.queryByRole('status', { name: messages.common.loading })).not.toBeInTheDocument();
    expect(screen.getByText('Todo operativo')).toBeInTheDocument();
    expect(screen.getByText('6 de 6 operativos')).toBeInTheDocument();
    expect(componentNames()).toEqual([
      'MailySoft System API',
      'Base de datos',
      'MailySoft Usuarios',
      'MailySoft Pacientes',
      'MailySoft Agenda',
      'Maily Web',
    ]);
    expect(heading).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says there is nothing to show when the list arrives empty, without an error (FR-011)', async () => {
    const health = createHealthMonitoringMock();
    health.setResult(healthResultDto({ components: [] }));
    renderPage();

    expect(await screen.findByText(text.page.empty)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a component it does not know with the generic texts, and the rest as usual', async () => {
    const health = createHealthMonitoringMock();
    health.setResult(
      healthResultDto({
        status: 'degraded',
        components: [
          ...healthResultDto().components,
          healthComponentDto({
            code: 'cola',
            name: 'Cola de mensajes',
            kind: 'queue',
            status: 'maintenance',
            error: 'quota_exceeded',
            checks: [],
          }),
        ],
      }),
    );
    const { user } = renderPage();
    await untilShown();

    const unknown = screen.getByRole('heading', { level: 3, name: 'Cola de mensajes' });
    const card = unknown.closest('li');
    if (card === null) {
      throw new Error('Expected the card of the component');
    }
    expect(card).toHaveTextContent('Desconocido');
    expect(card).toHaveTextContent('Componente');
    await user.click(
      within(card).getByRole('button', { name: text.details.toggleLabel('Cola de mensajes') }),
    );
    expect(card).toHaveTextContent(text.errors.unknownCode);
    expect(componentNames()).toHaveLength(3);
  });

  it('shows the degraded, the down, the stopped database and the unread registry, accessibly', async () => {
    const health = createHealthMonitoringMock();
    health.setResult(
      healthResultDto({
        status: 'down',
        registry_available: false,
        components: [
          healthComponentDto({ status: 'degraded', error: 'not_ready' }),
          healthComponentDto({
            code: 'database',
            name: 'Base de datos',
            kind: 'database',
            status: 'stopped',
            error: 'timeout',
            checks: [],
            next_start_at: '2026-11-02T14:00:00Z',
          }),
          healthComponentDto({
            code: 'mailysoft-usuarios',
            name: 'MailySoft Usuarios',
            status: 'down',
            error: 'connection_error',
          }),
        ],
      }),
    );
    const { container } = renderPage();
    await untilShown();

    expect(screen.getByText('Con componentes caídos')).toBeInTheDocument();
    expect(screen.getByText('0 de 3 operativos')).toBeInTheDocument();
    expect(screen.getByText(text.notices.databaseStopped, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(text.notices.registryUnavailable)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the failure of the first load with «Reintentar», which asks again (FR-030)', async () => {
    const health = createHealthMonitoringMock();
    health.failNext({ status: 404, code: 'not_found' });
    const { user, container } = renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.page.loadError.title);
    expect(alert).toHaveTextContent(text.page.loadError.message);
    expect(alert).not.toHaveTextContent(text.page.authorizationUnavailable);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(within(alert).getByRole('button', { name: messages.common.retry }));

    await untilShown();
    expect(health.requests).toHaveLength(2);
  });

  it('adds the possible cause when the permission could not be checked (503)', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(text.page.authorizationUnavailable);
    });
  });

  it('says the person may not see the health of the services when the service refuses it (403)', async () => {
    createHealthMonitoringMock({ directory: createUsersDirectoryMock() });
    const { container } = renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.page.noPermission);
    expect(screen.getByRole('heading', { level: 1, name: text.page.title })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('HealthPage keeps itself up to date (user story 2)', () => {
  it('says how long ago the data arrived and refreshes it when asked, keeping the focus (FR-026, FR-027)', async () => {
    const health = createHealthMonitoringMock();
    const { user, container } = renderPage();
    await untilShown();

    expect(screen.getByText((content) => content.startsWith('Actualizado hace'))).toBeVisible();
    const refresh = screen.getByRole('button', { name: text.page.refresh });
    const release = health.defer();
    await user.click(refresh);

    expect(await screen.findByText(text.page.updating)).toBeInTheDocument();
    expect(refresh).toHaveFocus();
    expect(refresh).toBeEnabled();
    expect(health.requests).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();

    release();
    await waitFor(() => {
      expect(screen.queryByText(text.page.updating)).not.toBeInTheDocument();
    });
    expect(refresh).toHaveFocus();
  });

  it('keeps the data when a refresh fails, with one notice that stays while the failures last (FR-030)', async () => {
    const health = createHealthMonitoringMock();
    const { user, container } = renderPage();
    await untilShown();
    const refresh = screen.getByRole('button', { name: text.page.refresh });

    health.failAll(500);
    await user.click(refresh);
    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent(text.page.refreshFailed);
    expect(notice).not.toHaveTextContent(text.page.authorizationUnavailable);
    expect(screen.getByRole('heading', { level: 3, name: 'MailySoft System API' })).toBeVisible();
    expect(screen.getByText((content) => content.startsWith('Actualizado hace'))).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();

    // Another failure keeps the same notice, so it is not announced again.
    await user.click(refresh);
    await waitFor(() => {
      expect(health.requests).toHaveLength(5);
    });
    await waitFor(() => {
      expect(screen.queryByText(text.page.updating)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBe(notice);

    health.recover();
    await user.click(refresh);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('adds the possible cause to the notice of a refresh refused for lack of a check of the permission (503)', async () => {
    const health = createHealthMonitoringMock();
    const { user } = renderPage();
    await untilShown();

    health.authorizationUnavailable();
    await user.click(screen.getByRole('button', { name: text.page.refresh }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${text.page.refreshFailed} ${text.page.authorizationUnavailable}`,
    );
  });
});

describe('HealthPage and the build of the Backoffice (user story 4)', () => {
  it('shows the block while it loads and with the data, last (FR-044)', async () => {
    createHealthMonitoringMock();
    renderPage();

    expect(buildBlock()).toBeInTheDocument();
    await untilShown();
    expect(buildBlock()).toHaveTextContent('1.0.0');
    expect(buildBlock()).toHaveTextContent('9fceb02');
  });

  it('shows it with the failure of the first load and of a refresh', async () => {
    const health = createHealthMonitoringMock();
    health.failNext({ status: 404, code: 'not_found' });
    const { user } = renderPage();

    await screen.findByRole('alert');
    expect(buildBlock()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: messages.common.retry }));
    await untilShown();
    health.failAll(404, 'not_found');
    await user.click(screen.getByRole('button', { name: text.page.refresh }));
    await screen.findByText(text.page.refreshFailed);
    expect(buildBlock()).toBeInTheDocument();
  });

  it('does not show it without permission', async () => {
    createHealthMonitoringMock({ directory: createUsersDirectoryMock() });
    renderPage();

    await screen.findByText(text.page.noPermission);
    expect(buildBlock()).not.toBeInTheDocument();
  });
});
