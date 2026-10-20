import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/** The answer of the `me` operation, kept as loose as needed to change the status of the user. */
const meAnswerSchema = z.looseObject({ user: z.looseObject({ status: z.looseObject({}) }) });

/** The heading of the Panel, the home page since feature 007 (it no longer greets the person). */
const panelHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: messages.home.title });

test.describe('the life of the session', () => {
  test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');

  test('V9: the access is checked again after five minutes and a blocked user loses it', async ({
    page,
  }) => {
    // The fake clock goes in before the application loads, so every timer of the page obeys it.
    await page.clock.install();
    await page.goto('/');
    await signIn(page, account('A1'));
    await expect(panelHeading(page)).toBeVisible();

    // From now on the users service reports the user as blocked (the database is not touched).
    await page.route('**/api/v1/authorization/me', async (route) => {
      const response = await route.fetch();
      const answer = meAnswerSchema.parse(await response.json());
      await route.fulfill({
        response,
        json: {
          ...answer,
          user: { ...answer.user, status: { id: 2, name: 'Bloqueado' } },
          roles: [],
        },
      });
    });
    await page.clock.fastForward('05:01');

    await expect(
      page.getByRole('heading', { level: 1, name: messages.denied.title }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(messages.denied.reasons.inactiveAccount);
  });

  test('V11: logging out in one tab takes the other tab to the access screen', async ({ page }) => {
    await page.goto('/');
    await signIn(page, account('A1'));
    await expect(panelHeading(page)).toBeVisible();

    const otherTab = await page.context().newPage();
    await otherTab.goto('/');
    // Depending on the browser, the Auth0 session is picked up at once or after one click.
    const otherPanel = panelHeading(otherTab);
    const signInButton = otherTab.getByRole('button', { name: messages.access.loginButton });
    await expect(otherPanel.or(signInButton)).toBeVisible();
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }
    await expect(otherPanel).toBeVisible();

    await page.getByRole('button', { name: messages.common.logout }).click();

    await expect(otherTab).toHaveURL(/\/access$/);
    await expect(
      otherTab.getByRole('heading', { level: 1, name: messages.access.title }),
    ).toBeVisible();
  });

  test('V12: warns at 14 minutes, continues on request, closes at 15 and comes back to the same screen', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/profile');
    await signIn(page, account('A1'));
    await expect(
      page.getByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeVisible();

    await page.clock.runFor('14:00');
    const warning = page.getByRole('alertdialog', { name: messages.idleDialog.title });
    await expect(warning).toBeVisible();

    await warning.getByRole('button', { name: messages.idleDialog.continue }).click();
    await expect(warning).toBeHidden();

    await page.clock.runFor('14:00');
    await expect(warning).toBeVisible();
    await page.clock.runFor('01:00');

    await expect(page).toHaveURL(/\/access\/idle$/);
    await expect(page.getByRole('alert')).toContainText(messages.access.notices.idle);

    await signIn(page, account('A1'));
    await expect(page).toHaveURL(/\/profile$/);
  });
});
