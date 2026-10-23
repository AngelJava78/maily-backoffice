import { screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { platformUserSchema } from '@/features/users';
import { messages } from '@/shared/messages/es';
import { operatorAccess, userDto, type UserDto } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ProfilePage } from './ProfilePage';

function renderProfile(
  user: Partial<UserDto> = {},
  roles: {
    id: number;
    name: string;
    type: { id: number; name: string };
    permissions: string[];
  }[] = [
    { id: 4, name: 'Marketing', type: { id: 1, name: 'Sistema' }, permissions: ['tenants:read'] },
    { id: 5, name: 'Owner', type: { id: 2, name: 'Clínica' }, permissions: [] },
  ],
) {
  return renderWithProviders(<ProfilePage />, {
    access: operatorAccess({ user: platformUserSchema.parse(userDto(user)), roles }),
  });
}

/** The value shown next to a label: the definition that follows its term. */
function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`No value follows the label ${label}`);
  }
  return value;
}

describe('ProfilePage', () => {
  it('shows the data of the platform user, each with its label (US5-1)', () => {
    renderProfile({
      first_name: 'María José',
      paternal_last_name: 'García',
      maternal_last_name: 'López',
      email: 'maria@clinica.com',
    });

    expect(screen.getByRole('heading', { level: 1, name: messages.profile.title })).toHaveFocus();
    expect(valueOf(messages.profile.name)).toHaveTextContent('María José');
    expect(valueOf(messages.profile.paternalLastName)).toHaveTextContent('García');
    expect(valueOf(messages.profile.maternalLastName)).toHaveTextContent('López');
    expect(valueOf(messages.profile.email)).toHaveTextContent('maria@clinica.com');
  });

  it('shows a dash when the user has no maternal last name', () => {
    renderProfile({ maternal_last_name: null });

    expect(valueOf(messages.profile.maternalLastName)).toHaveTextContent(
      messages.profile.emptyValue,
    );
  });

  it('shows the initials in the same decorative avatar as the header, not as an image (FR-005, 011-profile-avatar-menu)', () => {
    renderProfile({ first_name: 'María José', paternal_last_name: 'García' });

    const initials = screen.getByText('MJ');
    expect(initials.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('lists every active role of the user', () => {
    renderProfile();

    const roles = within(valueOf(messages.profile.roles)).getAllByRole('listitem');
    expect(roles.map((role) => role.textContent)).toEqual(['Marketing', 'Owner']);
  });

  it('says so when the user has no active roles', () => {
    renderProfile({}, []);

    expect(valueOf(messages.profile.roles)).toHaveTextContent(messages.profile.noRoles);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('offers nothing to edit except the (not yet working) photo (US5-2, FR-006)', () => {
    const { container } = renderProfile();

    expect(container.querySelector('input, textarea, select')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toEqual([
      screen.getByRole('button', { name: messages.profile.changePhoto }),
    ]);
  });

  it('offers to change the photo and says plainly it is not available yet (FR-006, SC-004, 011-profile-avatar-menu)', async () => {
    const { user, router } = renderProfile();
    const pathBefore = router.state.location.pathname;

    await user.click(screen.getByRole('button', { name: messages.profile.changePhoto }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.profile.changePhotoUnavailable,
    );
    expect(router.state.location.pathname).toBe(pathBefore);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderProfile();

    expect(await axe(container)).toHaveNoViolations();
  });
});
