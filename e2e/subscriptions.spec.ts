import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The subscriptions section against the real APIs (feature 003, quickstart V1 to V23). The readings
 * need A1, the permissions of step 1 and the test catalog of step 2. The tour that modifies the
 * catalog needs, besides, `E2E_ALLOW_SUBSCRIPTION_WRITES=true` and the clinics stub of step 3, so
 * that what it creates can be deleted (constitution VII).
 */
const text = messages.subscriptions;

const canWrite = process.env.E2E_ALLOW_SUBSCRIPTION_WRITES === 'true';

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

const grid = (page: Page) => page.getByRole('grid', { name: text.list.gridLabel });
const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });
const names = (page: Page) => grid(page).getByRole('link').allTextContents();

test.describe('the subscriptions section: readings (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  test('V1 to V3: lists the catalog in its fixed order, changes the page size and pages', async ({
    page,
  }) => {
    await openAs(page, '/subscriptions');

    await expect(heading(page, text.title)).toBeFocused();
    await expect(page.getByText('1–10 de 20')).toBeVisible();
    expect(await names(page)).toEqual([
      'Enterprise',
      ...Array.from({ length: 9 }, (_, index) => `Plan prueba 0${index + 1}`),
    ]);

    // The headers do not sort.
    await grid(page).getByRole('columnheader', { name: text.list.columns.monthlyPrice }).click();
    expect((await names(page))[0]).toBe('Enterprise');

    await page.getByRole('button', { name: 'Ir a la página siguiente' }).click();
    await expect(page.getByText('11–20 de 20')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    expect(await names(page)).toEqual([
      'Plan prueba 10',
      'Plan prueba 11',
      'Básico',
      'Clínica Plus',
      'Pro',
      'Premium',
      'Legacy full',
      'Solo',
      'Plan prueba 12',
      'Suspendido',
    ]);

    await page.getByLabel(/filas por página/i).click();
    await page.getByRole('option', { name: '25' }).click();
    await expect(page).toHaveURL(/page_size=25/);
    await expect(page.getByText('1–20 de 20')).toBeVisible();
  });

  test('V4 and V5: shows the prices in pesos per month, opens Solo from page 2 and comes back to it', async ({
    page,
  }) => {
    await openAs(page, '/subscriptions?page=2');

    const pro = grid(page).getByRole('row').filter({ hasText: 'Pro' }).first();
    await expect(pro.getByText('$4,500.00/mes')).toBeVisible();

    await grid(page).getByRole('link', { name: 'Solo' }).click();
    await expect(heading(page, text.detail.title)).toBeVisible();
    await expect(page.getByText('Para el médico que trabaja por su cuenta.')).toBeVisible();
    await expect(page.getByText(text.status.inactive, { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: '1 consultorio' })).toBeVisible();

    await page.getByRole('link', { name: text.detail.backToList }).click();
    await expect(page.getByText('11–20 de 20')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    const enterprise = grid(page).getByRole('row').filter({ hasText: 'Legacy full' });
    await expect(enterprise.getByText('$0.00/mes')).toBeVisible();
  });

  test('V7: says that a subscription does not exist, and that an address which is not an id is not a page', async ({
    page,
  }) => {
    await openAs(page, '/subscriptions');

    await navigate(page, '/subscriptions/99999');
    await expect(page.getByText(text.detail.notFound.title)).toBeVisible();
    await expect(page.getByRole('link', { name: text.detail.notFound.backToList })).toBeVisible();

    await navigate(page, '/subscriptions/abc');
    await expect(heading(page, messages.notFound.title)).toBeVisible();
  });
});

test.describe
  .serial('the subscriptions section: a disposable subscription from creation to deletion (A1)', () => {
  test.skip(
    !hasAccounts('A1') || !canWrite,
    'Needs A1, E2E_ALLOW_SUBSCRIPTION_WRITES=true and the clinics stub of the API',
  );

  const name = `QA 003 ${Date.now()}`;
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

  const chooseStatus = async (page: Page, verb: string) => {
    await page.getByRole('button', { name: text.actions.changeStatus }).click();
    await page.getByRole('menuitem', { name: verb }).click();
  };

  test('V9: creates it with two elements in what it includes', async ({ page }) => {
    await openAs(page, '/subscriptions/new');
    const fields = text.form.fields;

    await page.getByLabel(new RegExp(`^${fields.name}`)).fill(name);
    await page.getByLabel(new RegExp(`^${fields.monthlyPrice}`)).fill('1234.5');
    for (const value of ['Primer elemento', 'Segundo elemento']) {
      await page.getByRole('button', { name: text.form.addOtherFeature }).click();
      await page.keyboard.type(value);
    }
    await page.getByRole('button', { name: messages.common.save }).click();

    await expect(page.getByText(text.notices.created)).toBeVisible();
    await expect(heading(page, text.detail.title)).toBeVisible();
    await expect(page.getByText('$1,234.50/mes')).toBeVisible();
    detailPath = new URL(page.url()).pathname;
    expect(detailPath).toMatch(/^\/subscriptions\/\d+$/);
  });

  test('V13: changes its price', async ({ page }) => {
    await openDetail(page);

    await page.getByRole('link', { name: text.actions.edit }).click();
    const price = page.getByLabel(new RegExp(`^${text.form.fields.monthlyPrice}`));
    await expect(price).toHaveValue('1234.50');
    await price.fill('2000');
    await page.getByRole('button', { name: messages.common.save }).click();

    await expect(page.getByText(text.edit.saved)).toBeVisible();
    await expect(page.getByText('$2,000.00/mes')).toBeVisible();
  });

  test('V17 and V19: inactivates it, with its confirmation, and activates it again without one', async ({
    page,
  }) => {
    await openDetail(page);

    await chooseStatus(page, text.statusTargets.inactivate);
    await confirm(page, text.dialogs.inactivate.title, text.dialogs.inactivate.confirm);
    await expect(page.getByText(text.statusNotices.inactivated)).toBeVisible();

    await chooseStatus(page, text.statusTargets.activate);
    await expect(page.getByText(text.statusNotices.activated)).toBeVisible();
  });

  test('V21: deletes it, and the list does not show it any more', async ({ page }) => {
    await openDetail(page);

    await page.getByRole('button', { name: text.actions.delete }).click();
    await confirm(page, text.dialogs.delete.title, text.dialogs.delete.confirm);

    await expect(page.getByText(text.notices.deleted)).toBeVisible();
    await expect(heading(page, text.title)).toBeVisible();
    await page.getByLabel(/filas por página/i).click();
    await page.getByRole('option', { name: '50' }).click();
    await expect(grid(page).getByRole('link', { name })).toHaveCount(0);
  });
});
