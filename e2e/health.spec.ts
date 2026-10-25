import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * «Salud de servicios» against the real APIs (feature 016, research D22, quickstart V1, V2, V6 and
 * V8). Besides A1, it needs maily-system-api with its 005 and mailySoft-usuarios with its 016
 * deployed, and `health:read`, `health:write`, `health:update` and `health:delete` in the role of
 * A1 (quickstart, sections 0 and 1). It registers, edits, disables and deletes a component of its
 * own, «QA 016 <time stamp>», so it leaves the registry as it found it (constitution VII).
 */
const text = messages.health;

test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

/** Signs in as A1 on the way to an address; after that, the page is the one that was asked for. */
async function openAs(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await signIn(page, account('A1'));
  await expect(page).toHaveURL(new RegExp(`${address}$`));
}

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });
const input = (page: Page, label: string) =>
  page.getByRole('textbox', { name: new RegExp(`^${label}`) });

/** Whether a response is the one of the aggregator. */
const isAggregator = (url: string): boolean => new URL(url).pathname.endsWith('/api/v1/health');

test.describe('«Salud de servicios» (A1)', () => {
  test('V1: shows the overall status and the integrated components', async ({ page }) => {
    await openAs(page, '/health');

    await expect(heading(page, text.page.title)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: text.page.componentsTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: 'MailySoft System API' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Base de datos' })).toBeVisible();
    await expect(page.getByText(/ de \d+ operativos$/)).toBeVisible();
  });

  test('V6: asks the aggregator again by itself once the interval passes', async ({ page }) => {
    // The fake clock goes in before the application loads, so every timer of the page obeys it.
    await page.clock.install();
    let answers = 0;
    await page.route(
      (url) => isAggregator(url.toString()),
      async (route) => {
        answers += 1;
        await route.continue();
      },
    );
    await openAs(page, '/health');
    await expect(
      page.getByRole('heading', { level: 2, name: text.page.componentsTitle }),
    ).toBeVisible();
    const before = answers;

    // Thirty seconds by default; less where the environment says so.
    await page.clock.fastForward('00:31');

    await expect.poll(() => answers).toBeGreaterThan(before);
  });

  test('V2 and V8: registers a component, edits it, disables it and deletes it', async ({
    page,
  }) => {
    const name = `QA 016 ${String(Date.now())}`;
    const code = `qa-016-${String(Date.now())}`;
    await openAs(page, '/health/components');
    await expect(heading(page, text.registry.title)).toBeVisible();

    await page.getByRole('link', { name: text.registry.create }).first().click();
    await expect(heading(page, messages.titles.healthComponentCreate)).toBeVisible();
    await input(page, text.registry.fields.name).fill(name);
    await input(page, text.registry.fields.code).fill(code);
    await input(page, text.registry.fields.baseUrl).fill('http://127.0.0.1:8000');
    await page.getByRole('button', { name: messages.common.save }).click();
    await expect(page.getByText(text.registry.notices.created)).toBeVisible();

    await page.getByRole('link', { name }).click();
    await expect(heading(page, messages.titles.healthComponentDetail)).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole('link', { name: text.registry.edit }).click();
    await expect(heading(page, messages.titles.healthComponentEdit)).toBeVisible();
    await input(page, text.registry.fields.name).fill(`${name} editado`);
    await page.getByRole('checkbox', { name: text.registry.fields.enabled }).uncheck();
    await page.getByRole('button', { name: messages.common.save }).click();
    await expect(page.getByText(text.registry.notices.updated)).toBeVisible();

    await page.getByRole('link', { name: text.registry.backToList }).click();
    const row = page.getByRole('row', { name: new RegExp(`${name} editado`) });
    await expect(row).toContainText(text.registry.disabled);

    await page.getByRole('link', { name: `${name} editado` }).click();
    await page.getByRole('button', { name: text.registry.delete }).click();
    const dialog = page.getByRole('dialog', {
      name: text.registry.deleteDialog.title(`${name} editado`),
    });
    await dialog.getByRole('button', { name: text.registry.deleteDialog.confirm }).click();
    await expect(page.getByText(text.registry.notices.deleted)).toBeVisible();
    await expect(page.getByRole('link', { name: `${name} editado` })).toBeHidden();
  });
});
