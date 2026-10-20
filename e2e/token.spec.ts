import { expect, test, type Page } from '@playwright/test';

import { messages } from '../src/shared/messages/es';
import { account, hasAccounts } from './fixtures/accounts';
import { signIn } from './fixtures/signIn';

/**
 * The Token tool against the real services (feature 005, quickstart V1 to V7). It needs the
 * permission `token:read` assigned to `Administrator` in the users service, which does not exist
 * until someone creates it (quickstart, step 1): A1 is an Administrator and A2 is Marketing, the
 * one that does not have it. Without the accounts the specs are skipped (constitution VII).
 */
const text = messages.token;

const heading = (page: Page) => page.getByRole('heading', { level: 1, name: text.title });
const tokenField = (page: Page) => page.getByRole('textbox', { name: text.fields.token });
const navigation = (page: Page) => page.getByRole('navigation', { name: messages.nav.label });
const button = (page: Page, name: string) => page.getByRole('button', { name });

/** Same-page navigation: the tokens live in memory, so reloading would ask for the credentials. */
async function navigate(page: Page, address: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, address);
}

test.describe('the Token tool (A1, an Administrator with token:read)', () => {
  test.skip(
    !hasAccounts('A1'),
    'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1, and token:read assigned to Administrator',
  );

  test('V1, V3, V4, V6 and V7: generates, shows, refreshes, and starts over when the person leaves', async ({
    page,
  }) => {
    await page.goto('/');
    await signIn(page, account('A1'));

    // V1 and V3: the entry is in the navigation and the page opens empty, with only "Generar".
    await navigation(page).getByRole('link', { name: messages.nav.sections.token }).click();
    await expect(heading(page)).toBeFocused();
    await expect(page.getByRole('note')).toContainText(text.warning);
    await expect(tokenField(page)).toHaveValue('');
    await expect(button(page, text.actions.generate)).toBeVisible();
    await expect(button(page, text.actions.copy)).toHaveCount(0);

    // V4: "Generar" gives a hidden token, its expiry and "Vigente"; "Refrescar" takes its place.
    await button(page, text.actions.generate).click();
    await expect(button(page, text.actions.refresh)).toBeVisible();
    await expect(page.getByText(text.validity.valid)).toBeVisible();
    await expect(tokenField(page)).toHaveValue(text.mask);
    await button(page, text.actions.show).click();
    const first = await tokenField(page).inputValue();
    expect(first).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    // V6: "Refrescar" gives another token, hidden again.
    await button(page, text.actions.refresh).click();
    await expect(tokenField(page)).toHaveValue(text.mask);
    await button(page, text.actions.show).click();
    expect(await tokenField(page).inputValue()).not.toBe(first);

    // V7: leaving the page and coming back starts again from the empty page.
    await page.getByRole('link', { name: messages.nav.profile }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: messages.profile.title }),
    ).toBeVisible();
    await navigation(page).getByRole('link', { name: messages.nav.sections.token }).click();
    await expect(tokenField(page)).toHaveValue('');
    await expect(button(page, text.actions.generate)).toBeVisible();
  });
});

test.describe('the Token tool (A2, Marketing, without token:read)', () => {
  test.skip(!hasAccounts('A2'), 'Needs E2E_AUTH0_USER_A2 and E2E_AUTH0_PASSWORD_A2');

  test('V1 and V2: has no entry in the navigation, and its address leads home with the notice of the tool', async ({
    page,
  }) => {
    await page.goto('/');
    await signIn(page, account('A2'));
    await expect(navigation(page)).toBeVisible();
    await expect(
      navigation(page).getByRole('link', { name: messages.nav.sections.token }),
    ).toHaveCount(0);

    await navigate(page, '/tools/postman-token');

    await expect(page.getByText(text.noPermission)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(heading(page)).toHaveCount(0);
  });
});
