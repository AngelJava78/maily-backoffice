import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The users section against the real services (feature 002, quickstart V1 to V25). The readings
 * only need A1 and the seed users of the quickstart; the part that creates users needs, besides,
 * `E2E_ALLOW_USER_CREATION=true`, `E2E_NEW_USER_EMAIL_DOMAIN` and `E2E_NEW_USER_PASSWORD`, because
 * creating a user creates a real account in Auth0 (constitution VII).
 */
const text = messages.users;

const writes = {
  allowed: process.env.E2E_ALLOW_USER_CREATION === 'true',
  domain: process.env.E2E_NEW_USER_EMAIL_DOMAIN ?? '',
  password: process.env.E2E_NEW_USER_PASSWORD ?? '',
};
const canWrite = writes.allowed && writes.domain !== '' && writes.password !== '';

/** Signs in as A1 on the way to an address; after that, the page is the one that was asked for. */
async function openAs(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await signIn(page, account('A1'));
  await expect(page).toHaveURL(new RegExp(`${address.replace('?', '\\?')}$`));
}

/** Same-page navigation: the tokens live in memory, so reloading would ask for the credentials. */
async function navigate(page: Page, address: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, address);
}

const usersGrid = (page: Page) => page.getByRole('grid', { name: text.list.gridLabel });
const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

test.describe('the users section: readings (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  test('V1 to V3: lists the users, changes the page size, opens a detail and comes back to the same page', async ({
    page,
  }) => {
    await openAs(page, '/users');

    await expect(heading(page, text.title)).toBeFocused();
    await expect(page.getByText(/1–10 de \d+/)).toBeVisible();
    await expect(usersGrid(page).getByRole('link')).toHaveCount(10);

    await page.getByLabel(/filas por página/i).click();
    await page.getByRole('option', { name: '25' }).click();
    await expect(page).toHaveURL(/page_size=25/);
    await expect(page.getByText(/1–25 de \d+/)).toBeVisible();
    await page.getByLabel(/filas por página/i).click();
    await page.getByRole('option', { name: '10' }).click();

    await page.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await page.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect(page.getByText(/21–30 de \d+/)).toBeVisible();
    await expect(page).toHaveURL(/page=3/);

    await usersGrid(page).getByRole('link').first().click();
    await expect(heading(page, text.detail.title)).toBeVisible();
    await expect(page.getByRole('region', { name: text.roles.title })).toBeVisible();
    await page.getByRole('link', { name: text.detail.backToList }).click();

    await expect(page.getByText(/21–30 de \d+/)).toBeVisible();
    await expect(page).toHaveURL(/page=3/);
  });

  test('V5: says that a user does not exist, and that an address which is not a number is not a page', async ({
    page,
  }) => {
    await openAs(page, '/users');

    await navigate(page, '/users/99999999');
    await expect(page.getByText(text.detail.notFound.title)).toBeVisible();
    await expect(page.getByRole('link', { name: text.detail.notFound.backToList })).toBeVisible();

    await navigate(page, '/users/abc');
    await expect(heading(page, messages.notFound.title)).toBeVisible();
  });

  test('V7 and V8: finds a blocked and a deleted user by email, no one, and refuses an email that is not one', async ({
    page,
  }) => {
    await openAs(page, '/users');
    const email = page.getByLabel(text.search.label);
    const search = page.getByRole('button', { name: text.search.submit });

    await email.fill('seed01@ejemplo.com');
    await search.click();
    await expect(page.getByText(text.status.blocked, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: text.search.viewDetail })).toBeVisible();

    await email.fill('seed02@ejemplo.com');
    await search.click();
    await expect(page.getByText(text.status.deleted, { exact: true })).toBeVisible();

    await email.fill('nadie@ejemplo.com');
    await search.click();
    await expect(page.getByText(text.search.notFound)).toBeVisible();

    // A value that is not an email is refused next to the field, without asking the service.
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('by-email')) {
        asked.push(request.url());
      }
    });
    await email.fill('no-es-correo');
    await search.click();
    await expect(page.getByText(text.validation.emailInvalid)).toBeVisible();
    expect(asked).toHaveLength(0);

    // Reloading a search repeats its result (the email is in the address).
    await email.fill('seed01@ejemplo.com');
    await search.click();
    await expect(page.getByText(text.status.blocked, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/email=seed01%40ejemplo\.com/);
  });
});

test.describe
  .serial('the users section: a disposable user from creation to reactivation (A1)', () => {
  test.skip(
    !hasAccounts('A1') || !canWrite,
    'Needs A1, E2E_ALLOW_USER_CREATION=true, E2E_NEW_USER_EMAIL_DOMAIN and E2E_NEW_USER_PASSWORD',
  );

  const email = `qa+002-${Date.now()}@${writes.domain}`;
  let detailPath = '';

  const openDetail = async (page: Page) => {
    await openAs(page, detailPath);
    await expect(heading(page, text.detail.title)).toBeVisible();
  };

  const confirm = async (page: Page, title: string, button: string) => {
    const dialog = page.getByRole('dialog', { name: title });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: button, exact: true }).click();
    await expect(dialog).toBeHidden();
  };

  test('V9: creates the user with two roles and finds it afterwards', async ({ page }) => {
    await openAs(page, '/users/new');
    const fields = text.form.fields;

    await page.getByLabel(new RegExp(`^${fields.email}`)).fill(email);
    await page.getByLabel(new RegExp(`^${fields.password}`)).fill(writes.password);
    await page.getByLabel(new RegExp(`^${fields.firstName}`)).fill('Prueba');
    await page.getByLabel(new RegExp(`^${fields.paternalLastName}`)).fill('Dos');
    await page.getByRole('combobox', { name: /roles/i }).click();
    await page.getByRole('option', { name: 'Marketing' }).click();
    await page.getByRole('option', { name: 'Developer' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: text.form.save }).click();

    await expect(page.getByText(text.notices.created)).toBeVisible();
    await expect(heading(page, text.detail.title)).toBeVisible();
    const roles = page.getByRole('region', { name: text.roles.title });
    await expect(roles.getByText('Marketing')).toBeVisible();
    await expect(roles.getByText('Developer')).toBeVisible();
    detailPath = new URL(page.url()).pathname;
    expect(detailPath).toMatch(/^\/users\/\d+$/);
  });

  test('V15: adds a role and takes another away, each with its confirmation', async ({ page }) => {
    await openDetail(page);
    const roles = page.getByRole('region', { name: text.roles.title });

    await roles.getByRole('button', { name: text.roles.add }).click();
    await page.getByRole('combobox', { name: /^Role/ }).click();
    await page.getByRole('option', { name: 'Billing' }).click();
    await confirm(page, text.addRole.title, text.addRole.confirm);
    await expect(roles.getByText('Billing')).toBeVisible();

    await roles.getByRole('button', { name: text.roles.remove('Developer') }).click();
    await confirm(page, text.removeRole.title, text.removeRole.confirm);
    await expect(roles.getByText('Developer')).toBeHidden();
  });

  test('V20: blocks the user, finds it as blocked and unblocks it', async ({ page }) => {
    await openDetail(page);

    await page.getByRole('button', { name: text.actions.block }).click();
    await confirm(page, text.dialogs.block.title, text.dialogs.block.confirm);
    await expect(page.getByText(text.status.blocked, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: text.actions.unblock }).click();
    await confirm(page, text.dialogs.unblock.title, text.dialogs.unblock.confirm);
    await expect(page.getByText(text.status.active, { exact: true })).toBeVisible();
  });

  test('V22: deletes the user, finds it as deleted and reactivates it', async ({ page }) => {
    await openDetail(page);

    await page.getByRole('button', { name: text.actions.delete }).click();
    await confirm(page, text.dialogs.delete.title, text.dialogs.delete.confirm);
    await expect(page.getByText(text.status.deleted, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: text.actions.reactivate }).click();
    await confirm(page, text.dialogs.reactivate.title, text.dialogs.reactivate.confirm);
    await expect(page.getByText(text.status.active, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('region', { name: text.roles.title }).getByText('Marketing'),
    ).toBeVisible();
  });
});
