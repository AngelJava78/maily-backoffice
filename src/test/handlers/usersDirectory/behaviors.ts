import { createFailureControls } from '../shared/failures';

export type { FailureRule } from '../shared/failures';

/** The codes the users service answers with when it is down. */
const DEFAULT_CODES: ReadonlyMap<number, string> = new Map([
  [500, 'internal_error'],
  [503, 'authentication_unavailable'],
]);

/** What is wrong with the access account of the people, which the service reaches through Auth0. */
export interface IdentityFailures {
  /** Auth0 does not answer in time: 503 `identity_provider_unavailable`. */
  unavailable: boolean;
  /** Auth0 refuses the operation: 502 `identity_provider_error`. */
  rejected: boolean;
  /** Emails that already have an access account. */
  readonly existingAccounts: Set<string>;
  /** Users whose access account does not exist. */
  readonly missingAccounts: Set<string>;
  /** Auth0 finds the password too weak: 422 `password_rejected`. */
  passwordRejected: boolean;
}

/**
 * The failures a test can ask the simulator for: those of any simulator (a request that fails
 * once, every request failing, answers that never come or that wait for the test) and the failures
 * of the access account.
 */
export function createBehaviors() {
  const failures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const identity: IdentityFailures = {
    unavailable: false,
    rejected: false,
    existingAccounts: new Set(),
    missingAccounts: new Set(),
    passwordRejected: false,
  };

  return {
    /** What the identity failures say; the handlers of the operations that call Auth0 read it. */
    identityState: identity,

    intercept: failures.intercept,

    controls: {
      ...failures.controls,
      /** Failures of the access account of the people (FR-021). */
      identity: {
        unavailable(): void {
          identity.unavailable = true;
          identity.rejected = false;
        },
        rejected(): void {
          identity.rejected = true;
          identity.unavailable = false;
        },
        accountExists(email: string): void {
          identity.existingAccounts.add(email.trim().toLowerCase());
        },
        accountMissing(userId: string): void {
          identity.missingAccounts.add(userId);
        },
        recover(): void {
          identity.unavailable = false;
          identity.rejected = false;
          identity.existingAccounts.clear();
          identity.missingAccounts.clear();
        },
      },
      /** Auth0 finds every password too weak (or stops doing so with `false`). */
      rejectPassword(on = true): void {
        identity.passwordRejected = on;
      },
    },
  };
}

export type Behaviors = ReturnType<typeof createBehaviors>;
