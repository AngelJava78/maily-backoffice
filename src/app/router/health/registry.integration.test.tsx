import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { uuidOf } from '@/test/ids';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/health'),
    import('@/features/health/pages/HealthPage'),
    import('@/features/health/pages/MonitoredComponentsListPage'),
    import('@/features/health/pages/MonitoredComponentDetailPage'),
    import('@/features/health/pages/MonitoredComponentCreatePage'),
    import('@/features/health/pages/MonitoredComponentEditPage'),
    import('@/features/home'),
  ]);
}, 90_000);

afterEach(() => {
  focusManager.setFocused(undefined);
});

const text = messages.health.registry;
const ID = uuidOf(300);
const ALL = ['health:read', 'health:write', 'health:update', 'health:delete'];

/** The administrator with these permissions of «Salud de servicios», and the simulator. */
function start(
  permissions: readonly string[] = ALL,
  registered = [monitoredComponentDto({ id: ID })],
) {
  const directory = createUsersDirectoryMock();
  for (const permission of permissions) {
    directory.grant('Administrator', permission);
  }
  const health = createHealthMonitoringMock({ directory, registered });
  return { directory, health };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

/** Coming back to the tab checks the permissions again (feature 001, FR-019). */
function checkPermissionsAgain(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

const input = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });

/** The way back of the registry, inside the page (the navigation has an entry of the same name). */
const backToHealth = () =>
  within(screen.getByRole('main')).getByRole('link', { name: text.backToHealth });

async function untilList(): Promise<void> {
  await screen.findByRole('heading', { level: 1, name: text.title });
}

describe('«Componentes monitoreados»: the registry (user story 3)', { timeout: 30_000 }, () => {
  it('opens from «Salud de servicios», titled and focused, and its link goes back (FR-005)', async () => {
    start();
    const { user, router } = open('/health');
    await screen.findByRole('heading', { level: 2, name: messages.health.page.componentsTitle });

    await user.click(screen.getByRole('link', { name: text.link }));

    expect(router.state.location.pathname).toBe('/health/components');
    await untilList();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: text.title })).toHaveFocus();
    });
    expect(document.title).toBe(`${text.title} — ${messages.common.appName}`);
    await user.click(backToHealth());
    expect(router.state.location.pathname).toBe('/health');
  });

  it('registers a component, which the list and «Salud de servicios» show (US3-1, FR-042)', async () => {
    start(ALL, []);
    const { user, router } = open('/health/components');
    await untilList();
    expect(await screen.findByText(text.empty)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: text.create }));
    await screen.findByRole('heading', { level: 1, name: messages.titles.healthComponentCreate });
    await user.type(input(text.fields.name), 'MailySoft Usuarios');
    await user.type(input(text.fields.code), 'mailysoft-usuarios');
    await user.type(input(text.fields.baseUrl), 'http://mailysoft-usuarios:8000');
    await user.click(screen.getByRole('button', { name: messages.common.save }));

    expect(await screen.findByText(text.notices.created)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByRole('link', { name: 'MailySoft Usuarios' })).toBeInTheDocument();
    await user.click(backToHealth());
    expect(
      await screen.findByRole('heading', { level: 3, name: 'MailySoft Usuarios' }),
    ).toBeInTheDocument();
  });

  it('disables a component, which leaves «Salud de servicios», and enables it again', async () => {
    start();
    const { user } = open(`/health/components/${ID}/edit`);
    await screen.findByDisplayValue('MailySoft Usuarios');

    await user.click(screen.getByRole('checkbox', { name: text.fields.enabled }));
    await user.click(screen.getByRole('button', { name: messages.common.save }));
    expect(await screen.findByText(text.notices.updated)).toBeInTheDocument();
    await user.click(await screen.findByRole('link', { name: text.backToList }));
    const row = (await screen.findByRole('link', { name: 'MailySoft Usuarios' })).closest(
      '[role="row"]',
    );
    expect(row).toHaveTextContent(text.disabled);

    await user.click(backToHealth());
    await screen.findByRole('heading', { level: 3, name: 'Base de datos' });
    expect(
      screen.queryByRole('heading', { level: 3, name: 'MailySoft Usuarios' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a component after asking, and its code can be registered again (FR-040)', async () => {
    const { health } = start();
    const { user, router } = open(`/health/components/${ID}`);

    await user.click(await screen.findByRole('button', { name: text.delete }));
    const dialog = await screen.findByRole('dialog', {
      name: text.deleteDialog.title('MailySoft Usuarios'),
    });
    await user.click(within(dialog).getByRole('button', { name: text.deleteDialog.confirm }));

    expect(await screen.findByText(text.notices.deleted)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(health.registered()).toEqual([]);
  });

  it('offers no action to whoever may only read (FR-034)', async () => {
    start(['health:read']);
    open(`/health/components/${ID}`);

    expect(await screen.findByText('MailySoft Usuarios', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: text.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: text.delete })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: text.create })).not.toBeInTheDocument();
  });

  it.each([
    ['health:write', '/health/components/new'],
    ['health:update', `/health/components/${ID}/edit`],
  ])('sends whoever lacks %s back to the list with the usual notice', async (missing, url) => {
    start(ALL.filter((permission) => permission !== missing));
    const { router } = open(url);

    await untilList();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
  });

  it('closes the edition when health:update is taken away, and shows an action as soon as it is given (FR-032)', async () => {
    const { directory } = start(['health:read', 'health:update']);
    const { router } = open(`/health/components/${ID}/edit`);
    await screen.findByDisplayValue('MailySoft Usuarios');

    directory.revoke('Administrator', 'health:update');
    checkPermissionsAgain();

    await untilList();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(screen.queryByRole('link', { name: text.create })).not.toBeInTheDocument();
    directory.grant('Administrator', 'health:write');
    checkPermissionsAgain();
    expect(await screen.findByRole('link', { name: text.create })).toBeInTheDocument();
  });

  it('says that a component another person deleted no longer exists, with the list as it is (US3-13)', async () => {
    const { health } = start();
    const { user } = open('/health/components');
    const link = await screen.findByRole('link', { name: 'MailySoft Usuarios' });
    health.removeBehindTheScenes(ID);

    await user.click(link);

    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
    await untilList();
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
  });

  it('titles an address whose id is not one «Página no encontrada»', async () => {
    const { health } = start();
    open('/health/components/no-es-un-uuid');

    await waitFor(() => {
      expect(document.title).toBe(`${messages.titles.notFound} — ${messages.common.appName}`);
    });
    expect(health.requestsTo('GET', /monitored-components\//)).toHaveLength(0);
  });
});
