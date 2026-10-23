import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts, type AccountKey } from './fixtures/accounts';
import { logOut, profileMenuButton } from './fixtures/profileMenu';
import { signIn, startSignIn, submitCredentials } from './fixtures/signIn';

/** SC-001: from the credentials being sent to the home page being shown. */
const HOME_PAGE_BUDGET_MS = 5_000;

/** The heading of the Panel, the home page since feature 007 (it no longer greets the person). */
const panelHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: messages.home.title });

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
    await expect(panelHeading(page)).toBeVisible({ timeout: HOME_PAGE_BUDGET_MS });

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

    await logOut(page);
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

// feature 006: a single page, "Sin acceso" at its own address, with a single message whatever
// the reason — A9 has no MailySoft user, A7/A8 are not Active, A6 now has only a role of type
// Clínica (it used to be "Owner, an unauthorized role name"; the real classification of
// mailySoft-usuarios already makes Owner a role of type Clínica).
const DENIED: readonly AccountKey[] = ['A9', 'A7', 'A8', 'A6'];

test.describe('accounts that may not enter', () => {
  for (const key of DENIED) {
    test(`V7: ${key} sees "Sin acceso" with its account, and nothing protected`, async ({
      page,
    }) => {
      test.skip(!hasAccounts(key), `Needs E2E_AUTH0_USER_${key} and E2E_AUTH0_PASSWORD_${key}`);
      const { email } = account(key);

      await page.goto('/');
      await signIn(page, account(key));

      await expect(page).toHaveURL(/\/access-denied$/);
      await expect(
        page.getByRole('heading', { level: 1, name: messages.denied.title }),
      ).toBeVisible();
      await expect(page.getByRole('alert')).toContainText(messages.denied.message);
      await expect(page.getByText(messages.denied.signedInAs(email.toLowerCase()))).toBeVisible();
      await expect(page.getByRole('banner')).toBeHidden();
      await expect(profileMenuButton(page)).toBeHidden();
    });
  }

  // US5: closing the session from "Sin acceso" ends it fully (also at Auth0, FR-016), so a
  // different, authorized account can then enter without getting stuck looping back here.
  test('V10 of feature 006: logging out from "Sin acceso" lets a different account enter', async ({
    page,
  }) => {
    test.skip(!hasAccounts('A6', 'A1'), 'Needs E2E_AUTH0_USER_A6/A1 and E2E_AUTH0_PASSWORD_A6/A1');

    await page.goto('/');
    await signIn(page, account('A6'));
    await expect(page).toHaveURL(/\/access-denied$/);

    await page.getByRole('button', { name: messages.common.logout }).click();
    await expect(page).toHaveURL(/\/access$/);

    await startSignIn(page);
    await expect(page.locator('#username')).toBeVisible();
    await submitCredentials(page, account('A1'));

    await expect(panelHeading(page)).toBeVisible();
  });
});
