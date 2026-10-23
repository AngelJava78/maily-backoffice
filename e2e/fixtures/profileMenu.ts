import type { Page } from '@playwright/test';

import { messages } from '../../src/shared/messages/es';

/** The header's avatar button, whatever the signed-in person's name (011-profile-avatar-menu). */
export function profileMenuButton(page: Page) {
  return page.getByRole('button', { name: /^Menú de / });
}

/** Opens the header's profile menu. */
export async function openProfileMenu(page: Page): Promise<void> {
  await profileMenuButton(page).click();
  await page.getByRole('menu').waitFor();
}

/** Opens the header's profile menu and goes to "Mi perfil". */
export async function goToProfile(page: Page): Promise<void> {
  await openProfileMenu(page);
  await page.getByRole('menuitem', { name: messages.profile.title }).click();
}

/** Opens the header's profile menu and activates "Cerrar sesión". */
export async function logOut(page: Page): Promise<void> {
  await openProfileMenu(page);
  await page.getByRole('menuitem', { name: messages.common.logout }).click();
}
