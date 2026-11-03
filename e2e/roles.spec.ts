import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * Roles y permisos against the real services (features 014, 025 and 027, quickstart W1 to W15 — the
 * subset reachable from the interface alone, with no SQL step). Needs A1 (Administrator), whose
 * Sistema role already has `roles:*` in the real backend (`bootstrap_admin.sql`): no new account or
 * scope is required for this feature. Every role this spec creates is named with a timestamp so a
 * repeat run never collides with a role a previous run left behind, and the duplicate — created only
 * to prove deleting is not blocked by it being a copy — is deleted again before the spec ends.
 *
 * Since feature 027 the roles are a table, and a role is opened by pressing its name: it has a
 * screen of its own (`/roles/{id}`) and «Volver al listado» goes back to the table. The table is
 * opened with 50 roles per page, so a role this spec made is always on the first page.
 */
const text = messages.roles;

async function openRoles(page: Page): Promise<void> {
  await page.goto('/roles?page_size=50');
  await signIn(page, account('A1'));
  await expect(page.getByRole('heading', { level: 1, name: text.title })).toBeVisible();
  await expect(page).toHaveURL(/\/roles\?page_size=50$/);
}

const nameField = (page: Page) => page.getByLabel(text.detail.fields.name);
/** A button of the Tipo filter (feature 025), which replaced the Clínica/Sistema tabs. */
const typeFilter = (page: Page, name: string) =>
  page
    .getByRole('group', { name: text.filters.typeLabel })
    .getByRole('button', { name, exact: true });
/** The name of a role in the table, which is the link to its screen (feature 027). */
const roleLink = (page: Page, name: string) => page.getByRole('link', { name, exact: true });
const confirm = async (page: Page, title: string, button: string) => {
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
};
/** Opens a role from the table, in the Sistema filter, and waits for its own screen. */
async function openSistemaRole(page: Page, name: string): Promise<void> {
  await typeFilter(page, text.filters.type.system).click();
  await roleLink(page, name).click();
  await expect(page).toHaveURL(/\/roles\/\d+$/);
  await expect(nameField(page)).toHaveValue(name);
}

test.describe('the roles section: Sistema roles, end to end (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  const roleName = `QA role 014 ${Date.now()}`;

  test('W3 to W7: opens an existing Sistema role and toggles one of its permissions back and forth', async ({
    page,
  }) => {
    await openRoles(page);
    await openSistemaRole(page, 'Developer');

    const toggle = page.getByRole('button', { name: 'Ver de Roles', exact: true });
    const wasPressed = (await toggle.getAttribute('aria-pressed')) === 'true';

    await toggle.click();
    await page.getByRole('button', { name: text.detail.save }).click();
    await expect(toggle).toHaveAttribute('aria-pressed', String(!wasPressed));

    // Leaves the real environment exactly as it was found.
    await toggle.click();
    await page.getByRole('button', { name: text.detail.save }).click();
    await expect(toggle).toHaveAttribute('aria-pressed', String(wasPressed));

    // «Volver al listado» goes back to the same table, with the filter and the page size.
    await page.getByRole('link', { name: text.detail.backToList }).click();
    await expect(page).toHaveURL(/\/roles\?type=sistema&page_size=50$/);
    await expect(roleLink(page, 'Developer')).toBeVisible();
  });

  test('W8, W9: creates a Sistema role copying the permissions of another, and opens its screen', async ({
    page,
  }) => {
    await openRoles(page);

    await page.getByRole('button', { name: text.newRole }).click();
    await page.getByLabel(text.detail.fields.name).fill(roleName);
    // Within the dialog: the Tipo filter of the page (feature 025) has the same accessible name.
    await page.getByRole('dialog').getByLabel(text.detail.fields.type).click();
    await page.getByRole('option', { name: text.filters.type.system }).click();
    await page.getByLabel(text.form.copyFrom).click();
    await page.getByRole('option', { name: 'Administrator' }).click();
    await page.getByRole('button', { name: text.form.create }).click();

    await expect(page).toHaveURL(/\/roles\/\d+$/);
    await expect(nameField(page)).toHaveValue(roleName);
    await expect(page.getByText(/16 de 16 permisos/)).toBeVisible();

    // The table that «Volver al listado» goes back to shows the new role (FR-017).
    await page.getByRole('link', { name: text.detail.backToList }).click();
    await expect(roleLink(page, roleName)).toBeVisible();
  });

  test('025: blocks the role just created, finds it in Bloqueados and unblocks it', async ({
    page,
  }) => {
    await openRoles(page);
    await openSistemaRole(page, roleName);

    await page.getByRole('button', { name: text.status.block, exact: true }).click();
    await confirm(page, text.status.confirmTitle(roleName), text.status.confirm);
    await expect(page.getByText(text.status.blocked(roleName))).toBeVisible();
    // Back at the table it came from, with the title focused and the role out of Activos (FR-016).
    await expect(page).toHaveURL(/\/roles\?type=sistema&page_size=50$/);
    await expect(page.getByRole('heading', { level: 1, name: text.title })).toBeFocused();
    await expect(roleLink(page, roleName)).toBeHidden();

    await page
      .getByRole('group', { name: text.filters.statusLabel })
      .getByRole('button', { name: text.filters.status.blocked, exact: true })
      .click();
    await roleLink(page, roleName).click();
    await expect(page.getByText(text.blocked.explanation)).toBeVisible();
    await page.getByRole('button', { name: text.status.unblock, exact: true }).click();
    await expect(page.getByText(text.status.unblocked(roleName))).toBeVisible();
    await expect(page).toHaveURL(/\/roles\?type=sistema&status=bloqueados&page_size=50$/);
    await expect(roleLink(page, roleName)).toBeHidden();
  });

  test('W12, W13: duplicates the role just created, then deletes the duplicate', async ({
    page,
  }) => {
    await openRoles(page);
    await openSistemaRole(page, roleName);
    const originalAddress = new URL(page.url()).pathname;

    await page.getByRole('button', { name: text.detail.duplicate }).click();
    const duplicateName = `${roleName} (copia)`;
    // The copy opens on its own screen, with its name ready to edit.
    await expect(nameField(page)).toHaveValue(duplicateName);
    await expect(page).not.toHaveURL(new RegExp(`${originalAddress}$`));
    await expect(nameField(page)).toBeFocused();

    await page.getByRole('button', { name: messages.roles.delete.action }).click();
    await confirm(
      page,
      messages.roles.delete.confirmTitle(duplicateName),
      messages.roles.delete.confirm,
    );
    // Deleting goes back to the table, in place of the screen of the copy.
    await expect(page).toHaveURL(/\/roles\?/);
    await expect(roleLink(page, duplicateName)).toBeHidden();

    // The original (not the duplicate) is cleaned up here too, so no QA role lingers either way.
    await roleLink(page, roleName).click();
    await page.getByRole('button', { name: messages.roles.delete.action }).click();
    await confirm(
      page,
      messages.roles.delete.confirmTitle(roleName),
      messages.roles.delete.confirm,
    );
    await expect(page).toHaveURL(/\/roles\?/);
    await expect(roleLink(page, roleName)).toBeHidden();
  });
});
