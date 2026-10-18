import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { AccessDeniedReason } from '../policy/types';
import { AccessDeniedPage } from './AccessDeniedPage';

const REASONS: readonly (readonly [AccessDeniedReason, string])[] = [
  ['not_registered', messages.denied.reasons.notRegistered],
  ['inactive_account', messages.denied.reasons.inactiveAccount],
  ['no_authorized_role', messages.denied.reasons.noAuthorizedRole],
];

describe('AccessDeniedPage', () => {
  it.each(REASONS)('explains the reason %s (US2-1 to US2-3)', (reason, text) => {
    renderWithProviders(<AccessDeniedPage reason={reason} email="cuenta@ejemplo.com" />);

    expect(screen.getByRole('heading', { level: 1, name: messages.denied.title })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent(text);
  });

  it('shows the e-mail of the account the person signed in with', () => {
    renderWithProviders(<AccessDeniedPage reason="not_registered" email="cuenta@ejemplo.com" />);

    expect(screen.getByText(messages.common.account('cuenta@ejemplo.com'))).toBeInTheDocument();
  });

  it('leaves the account line out when Auth0 did not provide an e-mail', () => {
    renderWithProviders(<AccessDeniedPage reason="not_registered" email={null} />);

    expect(screen.queryByText(/Cuenta:/)).not.toBeInTheDocument();
  });

  it('lets the person log out', async () => {
    const { user, auth0 } = renderWithProviders(
      <AccessDeniedPage reason="inactive_account" email="cuenta@ejemplo.com" />,
    );

    await user.click(screen.getByRole('button', { name: messages.common.logout }));

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
  });

  it('shows no name, no link to the profile and nothing protected (FR-008)', () => {
    renderWithProviders(
      <AccessDeniedPage reason="no_authorized_role" email="cuenta@ejemplo.com" />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it.each(REASONS)('has no accessibility violations for %s', async (reason) => {
    const { container } = renderWithProviders(
      <AccessDeniedPage reason={reason} email="cuenta@ejemplo.com" />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
