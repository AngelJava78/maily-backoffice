import type { Page } from '@playwright/test';

import { messages } from '../../src/shared/messages/es';
import type { Account } from './accounts';

/**
 * How long to wait for the identity provider's "Authorize App" consent screen before assuming it
 * is not going to show (010-skip-reauth-consent, research.md D5): it always appears on `localhost`
 * (a non-verifiable redirect URI, independent of the provider's "skip consent" setting — `BASE_URL`
 * in `playwright.config.ts` is `localhost`, so every E2E sign-in hits this), and may also appear in
 * a deployed environment the first time, or after a new scope is requested (spec.md FR-003 of
 * 010-skip-reauth-consent). Kept short so a deployment where it correctly never appears doesn't pay
 * much for checking.
 */
const CONSENT_SCREEN_TIMEOUT_MS = 2_000;

/** Presses "Iniciar sesión" in the access screen, which takes the browser to the Auth0 login. */
export async function startSignIn(page: Page): Promise<void> {
  await page.getByRole('button', { name: messages.access.loginButton }).click();
  await page.locator('#username').waitFor();
}

/**
 * Accepts the identity provider's consent screen if it shows up after the credentials are sent; a
 * no-op otherwise (010-skip-reauth-consent). Not in Spanish and not this repository's to localize:
 * the button is matched by its English label, not translated along with the rest of the app.
 */
async function acceptConsentIfShown(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: 'Accept', exact: true });
  const shown = await accept
    .waitFor({ state: 'visible', timeout: CONSENT_SCREEN_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (shown) {
    await accept.click();
  }
}

/** Types the credentials in the Auth0 Universal Login, sends them, and clears any consent screen. */
export async function submitCredentials(page: Page, account: Account): Promise<void> {
  await page.locator('#username').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await acceptConsentIfShown(page);
}

/** The whole sign in, from the access screen until Auth0 has nothing more to ask. */
export async function signIn(page: Page, account: Account): Promise<void> {
  await startSignIn(page);
  await submitCredentials(page, account);
}
