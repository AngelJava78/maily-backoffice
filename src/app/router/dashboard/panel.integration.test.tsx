import { configure, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([import('@/features/home'), import('@/features/users')]);
}, 90_000);

const text = messages.dashboard;

/** The administrator of the users simulator, whose role has been given `dashboard:read`. */
function start() {
  const directory = createUsersDirectoryMock();
  directory.grant('Administrator', 'dashboard:read');
  const platform = createPlatformDashboardMock({ directory });
  return { directory, platform };
}

function open(url = '/') {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
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

describe('the Panel at the root of the backoffice (user story 1)', { timeout: 30_000 }, () => {
  it('is called «Panel» in the navigation, in its heading and in the title of the tab (FR-001, SC-001)', async () => {
    start();
    open();

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.home.title }),
    ).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    expect(within(navigation).getAllByRole('link')[0]).toHaveTextContent(messages.nav.home);
    expect(messages.nav.home).toBe('Panel');
    expect(document.title).toBe(`Panel — ${messages.common.appName}`);
    expect(document.body.textContent).not.toContain('Inicio');
  });

  it('shows the indicators and the recent clinics of the platform, asked for once and without a limit (FR-004 to FR-006)', async () => {
    const { platform } = start();
    open();
    await screen.findByRole('heading', { level: 2, name: text.indicatorsTitle });

    expect(valueOf(text.indicators.totalClinics)).toHaveTextContent('12');
    expect(valueOf(text.indicators.activeClinics)).toHaveTextContent('8');
    expect(valueOf(text.indicators.trialClinics)).toHaveTextContent('3');
    expect(valueOf(text.indicators.totalDoctors)).toHaveTextContent('37');
    expect(valueOf(text.indicators.totalPatients)).toHaveTextContent('1,284');
    expect(valueOf(text.indicators.totalUsers)).toHaveTextContent('52');

    const [, ...rows] = within(
      screen.getByRole('table', { name: text.recentClinics.title }),
    ).getAllByRole('row');
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Clínica Santa Aurora',
      'Consultorio Del Valle',
      'Centro Médico Horizonte',
      'Dental Sonríe',
      'Clínica San Rafael',
    ]);
    expect(screen.getByText(/^Hola, /)).toBeInTheDocument();

    expect(platform.requestsTo('GET', '/api/v1/dashboard')).toEqual([
      expect.objectContaining({ search: '' }),
    ]);
  });
});
