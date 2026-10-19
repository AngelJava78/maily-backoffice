import type { QueryClient } from '@tanstack/react-query';

import { describeUserError, type UserOperation } from '../api/userErrors';
import { roleKeys, userKeys } from './userKeys';

/** How long a change waits for the screen to show what is true before it lets its dialog go. */
export const REFRESH_WAIT_MS = 10_000;

/**
 * Waits for `work`, but no longer than `ms`. A change that waits for the screen to be refreshed
 * keeps its dialog busy, and a request that hangs (a 30 s limit and two retries) would keep the
 * dialog from being closed for a minute and a half.
 */
export function atMost(ms: number, work: Promise<unknown>): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    void work.then(done, done);
  });
}

/**
 * Whether the service refused a change because the user is not as the screen believes: its status
 * changed (blocked, deleted, active again) or it does not exist any more. What is cached about the
 * user is out of date then.
 */
export function isUserOutOfDate(error: unknown, operation: UserOperation): boolean {
  const { kind } = describeUserError(error, operation);
  return kind === 'statusChanged' || kind === 'notFound';
}

/**
 * Marks the user, and the lists and the searches it can be in, as stale, so the screens ask again
 * and show what is true. The roles are not touched: they would be refused for a user that cannot
 * have them, and the panel does not ask for them while the user is not active. The promise ends
 * when what is on screen was asked for again, or after `REFRESH_WAIT_MS`; a mutation that returns
 * it stays pending until then.
 */
export async function refreshUser(queryClient: QueryClient, userId: number): Promise<void> {
  await atMost(
    REFRESH_WAIT_MS,
    Promise.all([
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId), exact: true }),
      queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: userKeys.searches() }),
    ]),
  );
}

/**
 * What is left stale once a role was given or taken away, whatever the result (a role that was
 * already given or taken is told by the service, and the screen still has to show the real roles).
 * If the refusal says the user changed, it is the user that is refreshed instead. Returned by the
 * mutation, the dialog that asked for the change closes when the roles on screen are the real ones.
 */
export async function refreshAfterRoleChange(
  queryClient: QueryClient,
  userId: number,
  error: unknown,
  operation: UserOperation,
): Promise<void> {
  if (isUserOutOfDate(error, operation)) {
    await refreshUser(queryClient, userId);
    return;
  }
  await atMost(
    REFRESH_WAIT_MS,
    Promise.all([
      // A role that is gone from the catalog must not be offered again.
      describeUserError(error, operation).kind === 'roleUnavailable'
        ? queryClient.invalidateQueries({ queryKey: roleKeys.catalog() })
        : undefined,
      queryClient.invalidateQueries({ queryKey: userKeys.roles(userId) }),
    ]),
  );
}
