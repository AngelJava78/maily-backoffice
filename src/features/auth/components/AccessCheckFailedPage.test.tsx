import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AccessCheckFailedPage } from './AccessCheckFailedPage';

describe('AccessCheckFailedPage', () => {
  it('says the access could not be checked and what can be done (US2-5)', () => {
    renderWithProviders(<AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(messages.checkFailed.message);
    expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.logout })).toBeInTheDocument();
  });

  it('shows the e-mail of the account, and leaves the line out without one', () => {
    const { unmount } = renderWithProviders(
      <AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()} />,
    );
    expect(screen.getByText(messages.common.account('cuenta@ejemplo.com'))).toBeInTheDocument();
    unmount();

    renderWithProviders(<AccessCheckFailedPage email={null} refetch={vi.fn()} />);
    expect(screen.queryByText(/Cuenta:/)).not.toBeInTheDocument();
  });

  it('draws what the application gives it below the line of the account (feature 016)', () => {
    renderWithProviders(
      <AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()}>
        <section aria-label="Estado de la plataforma">Estado</section>
      </AccessCheckFailedPage>,
    );

    const account = screen.getByText(messages.common.account('cuenta@ejemplo.com'));
    const section = screen.getByRole('region', { name: 'Estado de la plataforma' });
    expect(
      account.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('checks again when the person asks to retry', async () => {
    const refetch = vi.fn<() => void>();
    const { user } = renderWithProviders(
      <AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={refetch} />,
    );

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it('lets the person log out', async () => {
    const { user, auth0 } = renderWithProviders(
      <AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: messages.common.logout }));

    expect(auth0.logout).toHaveBeenCalledExactlyOnceWith({
      logoutParams: { returnTo: `${window.location.origin}/access` },
    });
  });

  it('shows no name and no link to the profile (FR-008)', () => {
    renderWithProviders(<AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(
      <AccessCheckFailedPage email="cuenta@ejemplo.com" refetch={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
