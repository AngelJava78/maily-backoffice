import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts, type AccountKey } from './fixtures/accounts';
import { signIn, startSignIn, submitCredentials } from './fixtures/signIn';

/** SC-001: from the credentials being sent to the home page being shown. */
const HOME_PAGE_BUDGET_MS = 5_000;

const greeting = (page: Page) => page.getByRole('heading', { level: 1, name: /^Hola, / });

test.describe('access with an authorized account (A1)', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  test('V1 to V3: asks for the sign in, comes back to the address asked for and skips the access screen afterwards', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/access$/);
    await expect(
      page.getByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeVisible();

    await signIn(page, account('A1'));

    await expect(page).toHaveURL(/\/profile$/);
    await expect(
      page.getByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeVisible();

    // Without reloading (the tokens live in memory): opening the access screen goes to the home page.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/access');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/$/);
  });

  test('SC-001: the home page shows up within 5 seconds of sending the credentials', async ({
    page,
  }) => {
    await page.goto('/');
    await startSignIn(page);

    const sentAt = Date.now();
    await submitCredentials(page, account('A1'));
    await expect(greeting(page)).toBeVisible({ timeout: HOME_PAGE_BUDGET_MS });

    expect(Date.now() - sentAt).toBeLessThan(HOME_PAGE_BUDGET_MS);
  });

  test('V10: logging out ends the session, Back shows no data and signing in again asks for the credentials', async ({
    page,
  }) => {
    await page.goto('/profile');
    await signIn(page, account('A1'));
    await expect(
      page.getByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeVisible();

    await page.getByRole('button', { name: messages.common.logout }).click();
    await expect(page).toHaveURL(/\/access$/);

    await page.goBack();
    await expect(
      page.getByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeVisible();

    await startSignIn(page);
    await expect(page.locator('#password')).toBeVisible();
  });
});

const DENIED: readonly { readonly key: AccountKey; readonly reason: string }[] = [
  { key: 'A9', reason: messages.denied.reasons.notRegistered },
  { key: 'A7', reason: messages.denied.reasons.inactiveAccount },
  { key: 'A8', reason: messages.denied.reasons.inactiveAccount },
  { key: 'A6', reason: messages.denied.reasons.noAuthorizedRole },
];

test.describe('accounts that may not enter', () => {
  for (const { key, reason } of DENIED) {
    test(`V7: ${key} sees the denial with its reason and its account, and nothing protected`, async ({
      page,
    }) => {
      test.skip(!hasAccounts(key), `Needs E2E_AUTH0_USER_${key} and E2E_AUTH0_PASSWORD_${key}`);
      const { email } = account(key);

      await page.goto('/');
      await signIn(page, account(key));

      await expect(
        page.getByRole('heading', { level: 1, name: messages.denied.title }),
      ).toBeVisible();
      await expect(page.getByRole('alert')).toContainText(reason);
      await expect(page.getByText(messages.common.account(email.toLowerCase()))).toBeVisible();
      await expect(page.getByRole('banner')).toBeHidden();
      await expect(page.getByRole('link', { name: messages.nav.profile })).toBeHidden();
    });
  }
});
