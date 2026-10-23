import { screen, within } from '@testing-library/react';

import { messages } from '@/shared/messages/es';

import { renderWithProviders } from './renderWithProviders';

type User = ReturnType<typeof renderWithProviders>['user'];
type RoleScope = Pick<typeof screen, 'getByRole'>;

/**
 * The header's avatar button, whatever the signed-in person's name (011-profile-avatar-menu).
 * Pass `scope` (e.g. `within(someContainer)`) when more than one header is on the page at once.
 */
export function profileMenuButton(scope: RoleScope = screen) {
  return scope.getByRole('button', { name: /^Menú de / });
}

/** Opens the header's profile menu and returns it. */
export async function openProfileMenu(user: User, scope: RoleScope = screen) {
  await user.click(profileMenuButton(scope));
  return screen.findByRole('menu');
}

/** Opens the header's profile menu and activates "Cerrar sesión". */
export async function logOutFromHeader(user: User, scope: RoleScope = screen): Promise<void> {
  const menu = await openProfileMenu(user, scope);
  await user.click(within(menu).getByRole('menuitem', { name: messages.common.logout }));
}

/** Opens the header's profile menu and activates "Mi perfil". */
export async function goToProfileFromHeader(user: User, scope: RoleScope = screen): Promise<void> {
  const menu = await openProfileMenu(user, scope);
  await user.click(within(menu).getByRole('menuitem', { name: messages.profile.title }));
}
