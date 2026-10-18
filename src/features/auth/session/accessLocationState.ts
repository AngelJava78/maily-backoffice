import { z } from 'zod';

import { toSafeInternalPath } from '@/shared/lib/safeReturnPath';

/** Why the person arrives at the access screen, when it is not simply that they have no session. */
export const ACCESS_NOTICES = ['idle', 'expired', 'cancelled', 'idpError'] as const;

export type AccessNotice = (typeof ACCESS_NOTICES)[number];

/** The router state with which the application sends someone to the access screen. */
export interface AccessLocationState {
  /** Where to go after signing in. */
  readonly returnTo?: string;
  readonly notice?: AccessNotice;
}

const accessLocationStateSchema = z.object({
  returnTo: z.unknown().optional(),
  notice: z.unknown().optional(),
});

const noticeSchema = z.enum(ACCESS_NOTICES);

/**
 * Reads the router state of the access screen. The state is a boundary (anyone can craft one with
 * the history API), so each field is validated on its own: an invalid notice is dropped and an
 * address outside the application becomes `/`.
 */
export function readAccessLocationState(state: unknown): {
  readonly returnTo: string;
  readonly notice: AccessNotice | undefined;
} {
  const parsed = accessLocationStateSchema.safeParse(state);
  const raw = parsed.success ? parsed.data : { returnTo: undefined, notice: undefined };
  const notice = noticeSchema.safeParse(raw.notice);

  return {
    returnTo: toSafeInternalPath(raw.returnTo),
    notice: notice.success ? notice.data : undefined,
  };
}
