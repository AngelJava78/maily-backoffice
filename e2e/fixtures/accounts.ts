import { z } from 'zod';

/**
 * The test accounts of the quickstart (step 2): the Auth0 e-mail and password of each one are read
 * from `E2E_AUTH0_USER_<A1..A9>` and `E2E_AUTH0_PASSWORD_<A1..A9>`. They are never written down in
 * the repository; without them the end-to-end specs are skipped (constitution VII).
 *
 *   A1 Administrator          A6 only a role of type Clínica (Owner)
 *   A2 Marketing              A7 blocked user
 *   A3 Billing                A8 deleted user
 *   A4 Developer (no perms)   A9 Auth0 account without a MailySoft user
 *   A5 Marketing and Owner
 */
export const ACCOUNT_KEYS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'] as const;

export type AccountKey = (typeof ACCOUNT_KEYS)[number];

export interface Account {
  readonly email: string;
  readonly password: string;
}

const filled = z.string().min(1);

/** The accounts whose e-mail and password are both set, read from the given environment. */
export function readAccounts(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Readonly<Partial<Record<AccountKey, Account>>> {
  const accounts: Partial<Record<AccountKey, Account>> = {};
  for (const key of ACCOUNT_KEYS) {
    const email = filled.safeParse(environment[`E2E_AUTH0_USER_${key}`]);
    const password = filled.safeParse(environment[`E2E_AUTH0_PASSWORD_${key}`]);
    if (email.success && password.success) {
      accounts[key] = { email: email.data, password: password.data };
    }
  }
  return accounts;
}

/** Whether every account in `keys` is configured. */
export function hasAccounts(...keys: AccountKey[]): boolean {
  const accounts = readAccounts();
  return keys.every((key) => accounts[key] !== undefined);
}

/** One configured account; fails with a clear message if it is not. */
export function account(key: AccountKey): Account {
  const found = readAccounts()[key];
  if (found === undefined) {
    throw new Error(`Set E2E_AUTH0_USER_${key} and E2E_AUTH0_PASSWORD_${key} to use this account`);
  }
  return found;
}
