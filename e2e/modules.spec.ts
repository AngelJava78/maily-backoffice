import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The modules section against the real APIs (feature 013, quickstart W1 to W16). The readings need
 * A1 and the permissions of step 1; they only assume what the platform always has — Sistema and
 * Clínica groups, and the four base modules — never a specific test catalog, since this section (not
 * subscriptions) has none of its own in the real service. The disposable tour needs, besides,
 * `E2E_ALLOW_MODULE_WRITES=true`, so that what it creates can always be deleted again (constitution
 * VII): nothing it makes is left behind, whether the run succeeds or fails partway through.
 */
const text = messages.modules;

const canWrite = process.env.E2E_ALLOW_MODULE_WRITES === 'true';

async function openAs(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await signIn(page, account('A1'));
  await expect(page).toHaveURL(new RegExp(`${address.replace('?', '\\?')}$`));
}

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });
const row = (page: Page, name: string | RegExp) => page.getByRole('row', { name });

test.describe('the modules section: readings (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  test('W1: lists the catalog grouped by Sistema and Clínica, with the four base modules present', async ({
    page,
  }) => {
    await openAs(page, '/modules');

    await expect(heading(page, text.title)).toBeFocused();
    await expect(page.getByText(/^Sistema, pantallas del Backoffice/)).toBeVisible();
    await expect(page.getByText(/^Clínica, aplicación para clínicas/)).toBeVisible();
    // The module's key, not its name: "permissions" never collides with the table's own "Permisos"
    // column header, which also carries the "row" role.
    for (const key of ['users', 'roles', 'permissions', 'modules']) {
      await expect(row(page, new RegExp(key))).toBeVisible();
    }
  });

  test('W2: filtering by Tipo = Sistema hides the Clínica group', async ({ page }) => {
    await openAs(page, '/modules');
    await expect(page.getByText(/^Clínica, aplicación para clínicas/)).toBeVisible();

    await page.getByRole('button', { name: text.filters.type.system }).click();

    await expect(page.getByText(/^Clínica, aplicación para clínicas/)).toBeHidden();
    await expect(row(page, /modules/)).toBeVisible();
  });

  test('W4: searching for a base module narrows the list to it', async ({ page }) => {
    await openAs(page, '/modules');

    await page.getByRole('textbox', { name: text.filters.search }).fill('módulos');

    await expect(row(page, /modules/)).toBeVisible();
    await expect(row(page, /users/)).toHaveCount(0);
  });
});

test.describe
  .serial('the modules section: a disposable module from creation to deletion (A1)', () => {
  test.skip(!hasAccounts('A1') || !canWrite, 'Needs A1 and E2E_ALLOW_MODULE_WRITES=true');

  const key = `qa013_${Date.now()}`;
  const name = `QA 013 ${Date.now()}`;

  const editPanel = (page: Page) => page.getByRole('heading', { name: text.panel.editTitle });

  test('W6: creates it with two of its actions', async ({ page }) => {
    await openAs(page, '/modules');

    await page.getByRole('button', { name: text.newAction }).click();
    await page.getByRole('radio', { name: new RegExp(text.type.clinic) }).click();
    await page.getByRole('textbox', { name: text.form.fields.key }).fill(key);
    await page.getByRole('textbox', { name: text.form.fields.name }).fill(name);
    await page.getByRole('checkbox', { name: new RegExp(text.actions.update) }).click();
    await page.getByRole('button', { name: text.form.create }).click();

    await expect(page.getByText(text.notices.created)).toBeVisible();
    await expect(row(page, new RegExp(name))).toBeVisible();
  });

  test('W10, W11: changes its description and order, and marks a new action', async ({ page }) => {
    await openAs(page, '/modules');
    await row(page, new RegExp(name)).getByRole('button', { name: text.editAction }).click();
    await expect(editPanel(page)).toBeVisible();

    await page
      .getByRole('textbox', { name: text.form.fields.description })
      .fill('Creado por la prueba E2E de 013.');
    await page.getByRole('textbox', { name: text.form.fields.order }).fill('9999');
    await page.getByRole('checkbox', { name: new RegExp(text.actions.delete) }).click();
    await page.getByRole('button', { name: text.form.save }).click();

    await expect(page.getByText(text.notices.saved)).toBeVisible();
    const updated = row(page, new RegExp(name));
    await expect(updated).toContainText('9999');
    await expect(updated).toContainText(text.actions.delete);
  });

  test('W12: unmarks an action after confirming', async ({ page }) => {
    await openAs(page, '/modules');
    await row(page, new RegExp(name)).getByRole('button', { name: text.editAction }).click();
    await expect(editPanel(page)).toBeVisible();

    await page.getByRole('checkbox', { name: new RegExp(text.actions.delete) }).click();
    const dialog = page.getByRole('dialog', { name: text.form.uncheckActionTitle });
    await expect(dialog).toContainText(name);
    await dialog.getByRole('button', { name: text.form.uncheckActionRemove }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: text.form.save }).click();

    await expect(page.getByText(text.notices.saved)).toBeVisible();
    await expect(row(page, new RegExp(name))).not.toContainText(text.actions.delete);
  });

  test('W14: blocks it, moves to the Bloqueados filter, and unblocks it back', async ({ page }) => {
    await openAs(page, '/modules');
    await row(page, new RegExp(name)).getByRole('button', { name: text.editAction }).click();
    await expect(editPanel(page)).toBeVisible();

    await page.getByRole('button', { name: text.blockSection.block }).click();
    await expect(page.getByText(text.notices.blocked)).toBeVisible();
    await expect(row(page, new RegExp(name))).toHaveCount(0);

    await page.getByRole('button', { name: text.filters.status.blocked }).click();
    await row(page, new RegExp(name)).getByRole('button', { name: text.editAction }).click();
    await page.getByRole('button', { name: text.blockSection.unblock }).click();
    await expect(page.getByText(text.notices.unblocked)).toBeVisible();

    await page.getByRole('button', { name: text.filters.status.active }).click();
    await expect(row(page, new RegExp(name))).toBeVisible();
  });

  test('W16: deletes it, and the list does not show it any more', async ({ page }) => {
    await openAs(page, '/modules');
    await row(page, new RegExp(name)).getByRole('button', { name: text.editAction }).click();
    await expect(editPanel(page)).toBeVisible();

    await page.getByRole('button', { name: text.blockSection.delete }).click();
    const dialog = page.getByRole('dialog', { name: text.blockSection.delete });
    await expect(dialog).toContainText(name);
    await dialog.getByRole('button', { name: text.blockSection.deleteConfirmButton }).click();

    await expect(page.getByText(text.blockSection.deleted)).toBeVisible();
    await expect(row(page, new RegExp(name))).toHaveCount(0);
  });
});
