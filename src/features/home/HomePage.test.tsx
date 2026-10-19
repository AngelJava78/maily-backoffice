import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HomePage } from './HomePage';

function accessWith(...permissions: string[]) {
  return operatorAccess({ permissions: new Set(permissions) });
}

describe('HomePage', () => {
  it('greets the operator by name and moves the focus to the greeting', () => {
    renderWithProviders(<HomePage />, { access: accessWith('tenants:read') });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(messages.home.greeting('Ana Pérez'));
    expect(heading).toHaveFocus();
  });

  it('tells a person without permissions that their role has none yet (US1-6)', () => {
    renderWithProviders(<HomePage />, { access: accessWith() });

    expect(screen.getByRole('alert')).toHaveTextContent(messages.home.noPermissionsTitle);
    expect(screen.getByRole('alert')).toHaveTextContent(messages.home.noPermissionsNotice);
  });

  it.each([['tenants:read'], ['users:read'], ['subscriptions:read']])(
    'does not show the notice to someone who can read with %s',
    (permission) => {
      renderWithProviders(<HomePage />, { access: accessWith(permission) });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('shows the notice when the only permissions cannot open any section', () => {
    renderWithProviders(<HomePage />, { access: accessWith('users:write', 'roles:read') });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<HomePage />, { access: accessWith() });

    expect(await axe(container)).toHaveNoViolations();
  });
});
