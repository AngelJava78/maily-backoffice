import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The Panel against the real APIs (feature 007, quickstart V1, V2, V6 and V10). Besides A1, it
 * needs `dashboard:read` in the role of A1 in the users API of the environment (quickstart, step 1);
 * the data are the fictitious ones of phase 1 of the service.
 */
const text = messages.dashboard;

test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

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

const panelHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: messages.home.title });
const recentClinics = (page: Page) => page.getByRole('table', { name: text.recentClinics.title });
const lastUpdated = (page: Page) => page.getByText(/^Actualizado: /);

/** Whether a response is the one of the summary of the Panel. */
const isSummary = (url: string): boolean => new URL(url).pathname.endsWith('/api/v1/dashboard');

test.describe('the Panel (A1)', () => {
  test('V1 and V2: shows the six indicators, the recent clinics and when they were updated', async ({
    page,
  }) => {
    await openAs(page, '/');

    await expect(panelHeading(page)).toBeVisible();
    await expect(page.getByText(/^Hola, /)).toBeVisible();
    for (const label of Object.values(text.indicators)) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(recentClinics(page)).toBeVisible();
    await expect(lastUpdated(page)).toBeVisible();
  });

  test('V10: coming back from Usuarios shows the data at once and then the new time', async ({
    page,
  }) => {
    await page.clock.install();
    await openAs(page, '/');
    await expect(recentClinics(page)).toBeVisible();
    const firstTime = await lastUpdated(page).textContent();

    await navigate(page, '/users');
    await expect(page.getByRole('heading', { level: 1, name: messages.users.title })).toBeVisible();
    // A moment later, so that the time of the update has to change.
    await page.clock.fastForward('00:02');
    await navigate(page, '/');

    await expect(panelHeading(page)).toBeVisible();
    await expect(recentClinics(page)).toBeVisible();
    await expect(lastUpdated(page)).not.toHaveText(firstTime ?? '');
  });

  test('V6: asks the platform again by itself once the interval passes', async ({ page }) => {
    // The fake clock goes in before the application loads, so every timer of the page obeys it.
    await page.clock.install();
    let answers = 0;
    page.on('response', (response) => {
      if (isSummary(response.url())) {
        answers += 1;
      }
    });
    await openAs(page, '/');
    await expect(recentClinics(page)).toBeVisible();
    const before = answers;

    // Five minutes by default; less where the environment says so.
    await page.clock.fastForward('05:01');

    await expect.poll(() => answers).toBeGreaterThan(before);
  });
});
