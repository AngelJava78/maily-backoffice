import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

const SIZES = [
  { name: '1024 x 768', width: 1024, height: 768 },
  { name: '320 x 640', width: 320, height: 640 },
] as const;

/** FR-022 and SC-010: nothing is wider than the window, so there is no horizontal scrolling. */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** SC-005: the profile and the way out are always at hand in the header. */
async function expectHeaderShortcuts(page: Page): Promise<void> {
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: messages.nav.profile })).toBeVisible();
  await expect(header.getByRole('button', { name: messages.common.logout })).toBeVisible();
}

for (const size of SIZES) {
  test.describe(`at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('the access screen, without a session, reflows', async ({ page }) => {
      await page.goto('/access');

      await expect(page.getByRole('button', { name: messages.access.loginButton })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('the access denied screen (A9) reflows', async ({ page }) => {
      test.skip(!hasAccounts('A9'), 'Needs E2E_AUTH0_USER_A9 and E2E_AUTH0_PASSWORD_A9');
      await page.goto('/');
      await signIn(page, account('A9'));

      await expect(
        page.getByRole('heading', { level: 1, name: messages.denied.title }),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test('the home page, the profile and an unknown address (A1) reflow, with the shortcuts in the header', async ({
      page,
    }) => {
      test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');
      await page.goto('/');
      await signIn(page, account('A1'));

      await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      // Same-page navigation keeps the tokens, which live in memory.
      await page.getByRole('link', { name: messages.nav.profile }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: messages.profile.title }),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      await page.evaluate(() => {
        window.history.pushState({}, '', '/no-existe');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect(
        page.getByRole('heading', { level: 1, name: messages.notFound.title }),
      ).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);
    });

    test('the users list, a detail, the creation form and the edit form (A1) reflow, with the shortcuts in the header', async ({
      page,
    }) => {
      test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');
      await page.goto('/users');
      await signIn(page, account('A1'));

      // The table scrolls inside its own box: the page itself does not.
      const heading = (name: string) => page.getByRole('heading', { level: 1, name });
      await expect(heading(messages.users.title)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      await page
        .getByRole('grid', { name: messages.users.list.gridLabel })
        .getByRole('link')
        .first()
        .click();
      await expect(heading(messages.users.detail.title)).toBeVisible();
      await expect(page.getByRole('region', { name: messages.users.roles.title })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      await page.getByRole('link', { name: messages.users.actions.edit }).click();
      await expect(heading(messages.users.edit.title)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      // Same-page navigation keeps the tokens, which live in memory.
      await page.evaluate(() => {
        window.history.pushState({}, '', '/users/new');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect(heading(messages.users.form.createTitle)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);
    });

    test('the Token tool (A1) reflows, empty and with a long token on view, with the shortcuts in the header', async ({
      page,
    }) => {
      test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1');
      await page.goto('/tools/postman-token');
      await signIn(page, account('A1'));

      const text = messages.token;
      const tokenField = page.getByRole('textbox', { name: text.fields.token });
      await expect(page.getByRole('heading', { level: 1, name: text.title })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);

      await page.getByRole('button', { name: text.actions.generate }).click();
      await page.getByRole('button', { name: text.actions.show }).click();
      await expect(tokenField).not.toHaveValue(text.mask);
      await expectNoHorizontalScroll(page);
      await expectHeaderShortcuts(page);
      // The long token wraps inside its field instead of making the page wider.
      const overflowsItsField = await tokenField.evaluate(
        (field) => field.scrollWidth > field.clientWidth,
      );
      expect(overflowsItsField).toBe(false);
    });
  });
}
