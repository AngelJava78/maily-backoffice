import type { Page } from '@playwright/test';

import { messages } from '../../src/shared/messages/es';
import type { Account } from './accounts';

/** Presses "Iniciar sesión" in the access screen, which takes the browser to the Auth0 login. */
export async function startSignIn(page: Page): Promise<void> {
  await page.getByRole('button', { name: messages.access.loginButton }).click();
  await page.locator('#username').waitFor();
}

/** Types the credentials in the Auth0 Universal Login and sends them. */
export async function submitCredentials(page: Page, account: Account): Promise<void> {
  await page.locator('#username').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

/** The whole sign in, from the access screen until Auth0 has been sent the credentials. */
export async function signIn(page: Page, account: Account): Promise<void> {
  await startSignIn(page);
  await submitCredentials(page, account);
}
