import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * Roles y permisos against the real services (feature 014, quickstart W1 to W15 — the subset
 * reachable from the interface alone, with no SQL step). Needs A1 (Administrator), whose Sistema
 * role already has `roles:*` in the real backend (`bootstrap_admin.sql`): no new account or scope
 * is required for this feature. Every role this spec creates is named with a timestamp so a repeat
 * run never collides with a role a previous run left behind, and the duplicate — created only to
 * prove deleting is not blocked by it being a copy — is deleted again before the spec ends.
 */
const text = messages.roles;

async function openRoles(page: Page): Promise<void> {
  await page.goto('/roles');
  await signIn(page, account('A1'));
  await expect(page).toHaveURL(/\/roles$/);
}

const nameField = (page: Page) => page.getByLabel(text.detail.fields.name);
const confirm = async (page: Page, title: string, button: string) => {
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
};

test.describe('the roles section: Sistema roles, end to end (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  const roleName = `QA role 014 ${Date.now()}`;

  test('W3 to W7: opens an existing Sistema role and toggles one of its permissions back and forth', async ({
    page,
  }) => {
    await openRoles(page);
    await page.getByRole('tab', { name: text.tabs.sistema }).click();
    await page.getByText('Developer', { exact: true }).click();
    await expect(nameField(page)).toHaveValue('Developer');

    const checkbox = page.getByRole('checkbox', { name: 'Ver de Roles' });
    const wasChecked = await checkbox.isChecked();

    await checkbox.click();
    await page.getByRole('button', { name: text.detail.save }).click();
    await expect(checkbox).toBeChecked({ checked: !wasChecked });

    // Leaves the real environment exactly as it was found.
    await checkbox.click();
    await page.getByRole('button', { name: text.detail.save }).click();
    await expect(checkbox).toBeChecked({ checked: wasChecked });
  });

  test('W8, W9: creates a Sistema role copying the permissions of another', async ({ page }) => {
    await openRoles(page);

    await page.getByRole('button', { name: text.newRole }).click();
    await page.getByLabel(text.detail.fields.name).fill(roleName);
    await page.getByLabel(text.detail.fields.type).click();
    await page.getByRole('option', { name: text.tabs.sistema }).click();
    await page.getByLabel(text.form.copyFrom).click();
    await page.getByRole('option', { name: 'Administrator' }).click();
    await page.getByRole('button', { name: text.form.create }).click();

    await expect(nameField(page)).toHaveValue(roleName);
    await expect(page.getByText(/16 de 16 permisos/)).toBeVisible();
  });

  test('W12, W13: duplicates the role just created, then deletes the duplicate', async ({
    page,
  }) => {
    await openRoles(page);
    await page.getByRole('tab', { name: text.tabs.sistema }).click();
    await page.getByText(roleName, { exact: true }).click();
    await expect(nameField(page)).toHaveValue(roleName);

    await page.getByRole('button', { name: text.detail.duplicate }).click();
    const duplicateName = `${roleName} (copia)`;
    await expect(nameField(page)).toHaveValue(duplicateName);
    await expect(nameField(page)).toBeFocused();

    await page.getByRole('button', { name: messages.roles.delete.action }).click();
    await confirm(
      page,
      messages.roles.delete.confirmTitle(duplicateName),
      messages.roles.delete.confirm,
    );
    await expect(page.getByText(duplicateName)).toBeHidden();

    // The original (not the duplicate) is cleaned up here too, so no QA role lingers either way.
    await page.getByText(roleName, { exact: true }).click();
    await page.getByRole('button', { name: messages.roles.delete.action }).click();
    await confirm(
      page,
      messages.roles.delete.confirmTitle(roleName),
      messages.roles.delete.confirm,
    );
    await expect(page.getByText(roleName)).toBeHidden();
  });
});
