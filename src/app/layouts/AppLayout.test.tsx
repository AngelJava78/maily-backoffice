import { screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';
import { sampleSections } from '@/test/sampleSections';

import { AppLayout } from './AppLayout';

function accessWith(...permissions: string[]) {
  return operatorAccess({ permissions: new Set(permissions) });
}

function renderLayout(access = accessWith('tenants:read')) {
  return renderWithProviders(
    [
      {
        path: '/',
        element: <AppLayout sections={sampleSections} />,
        handle: { titleKey: 'home' },
        children: [{ index: true, element: <h1>Page content</h1> }],
      },
    ],
    { access },
  );
}

describe('AppLayout', () => {
  it('shows the operator name and the log out button in the header (US1-5)', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    expect(within(header).getByText('Ana Pérez')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: messages.common.logout }),
    ).toBeInTheDocument();
  });

  it('lists the home page and only the sections the person can read', () => {
    renderLayout(accessWith('tenants:read', 'users:write'));

    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    const links = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toEqual([messages.nav.home, messages.nav.sections.clinics]);
    expect(
      within(navigation).getByRole('link', { name: messages.nav.sections.clinics }),
    ).toHaveAttribute('href', '/clinics');
  });

  it('lists every section to someone who can read all of them', () => {
    renderLayout(accessWith('users:read', 'subscriptions:read', 'tenants:read'));

    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      messages.nav.home,
      messages.nav.sections.users,
      messages.nav.sections.subscriptionTypes,
      messages.nav.sections.clinics,
    ]);
  });

  it('lists only the home page to someone without permissions', () => {
    renderLayout(accessWith());

    const navigation = screen.getByRole('navigation', { name: messages.nav.label });
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([messages.nav.home]);
  });

  it('offers a skip link to the content and the landmark regions', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: messages.nav.skipLink })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: messages.nav.label })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('renders the page of the route inside the main region', async () => {
    renderLayout();

    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Page content' })).toBeInTheDocument();
  });

  it('sets the title of the document from the route', () => {
    renderLayout();

    expect(document.title).toBe(`${messages.titles.home} — ${messages.common.appName}`);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLayout(accessWith('users:read', 'tenants:read'));
    await screen.findByRole('heading', { name: 'Page content' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
