import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { RoleTypeTabs } from './RoleTypeTabs';

describe('RoleTypeTabs', () => {
  it('shows Clínica selected by default, and both tabs by their label', () => {
    renderWithProviders(<RoleTypeTabs />, { route: '/roles' });

    expect(screen.getByRole('tab', { name: messages.roles.tabs.clinica, selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: messages.roles.tabs.sistema, selected: false })).toBeInTheDocument();
  });

  it('reads the active tab from the URL', () => {
    renderWithProviders(<RoleTypeTabs />, { route: '/roles?type=sistema' });

    expect(screen.getByRole('tab', { name: messages.roles.tabs.sistema, selected: true })).toBeInTheDocument();
  });

  it('changing the tab writes it to the URL and clears any selected role', async () => {
    const { user, router } = renderWithProviders(<RoleTypeTabs />, {
      route: '/roles?type=clinica&roleId=6',
    });

    await user.click(screen.getByRole('tab', { name: messages.roles.tabs.sistema }));

    expect(router.state.location.search).toBe('?type=sistema');
  });
});
