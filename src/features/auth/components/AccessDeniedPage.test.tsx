import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AccessDeniedPage } from './AccessDeniedPage';

describe('AccessDeniedPage', () => {
  it('shows the single title and message, whatever the reason would have been (FR-003, FR-013)', () => {
    renderWithProviders(
      <AccessDeniedPage email="cuenta@ejemplo.com" mailySoftAppUrl={undefined} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: messages.denied.title })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent(messages.denied.message);
  });

  it('shows "Iniciaste sesión como" with the e-mail of the account (FR-014)', () => {
    renderWithProviders(
      <AccessDeniedPage email="cuenta@ejemplo.com" mailySoftAppUrl={undefined} />,
    );

    expect(screen.getByText(messages.denied.signedInAs('cuenta@ejemplo.com'))).toBeInTheDocument();
  });

  it('leaves the account line out when there is no e-mail at all', () => {
    renderWithProviders(<AccessDeniedPage email={null} mailySoftAppUrl={undefined} />);

    expect(screen.queryByText(/Iniciaste sesión como/)).not.toBeInTheDocument();
  });

  it('lets the person log out', async () => {
    const { user, auth0 } = renderWithProviders(
      <AccessDeniedPage email="cuenta@ejemplo.com" mailySoftAppUrl={undefined} />,
    );

    await user.click(screen.getByRole('button', { name: messages.common.logout }));

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
  });

  // FR-015: the link only exists when the environment configured the URL.
  it('offers "Ir a MailySoft" when the link is configured', () => {
    renderWithProviders(
      <AccessDeniedPage
        email="cuenta@ejemplo.com"
        mailySoftAppUrl="https://clinicas.mailysoft.example"
      />,
    );

    expect(screen.getByRole('link', { name: messages.denied.goToMailySoft })).toHaveAttribute(
      'href',
      'https://clinicas.mailysoft.example',
    );
  });

  it('has no link at all when it is not configured', () => {
    renderWithProviders(
      <AccessDeniedPage email="cuenta@ejemplo.com" mailySoftAppUrl={undefined} />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no name, no link to the profile and nothing protected (FR-012)', () => {
    renderWithProviders(
      <AccessDeniedPage
        email="cuenta@ejemplo.com"
        mailySoftAppUrl="https://clinicas.mailysoft.example"
      />,
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    // The only link on the page is "Ir a MailySoft", never one to the profile.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('has no accessibility violations with the link', async () => {
    const { container } = renderWithProviders(
      <AccessDeniedPage
        email="cuenta@ejemplo.com"
        mailySoftAppUrl="https://clinicas.mailysoft.example"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations without the link or the account line', async () => {
    const { container } = renderWithProviders(
      <AccessDeniedPage email={null} mailySoftAppUrl={undefined} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
