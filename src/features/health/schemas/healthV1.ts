import { z } from 'zod';

/** L1: the body of `/health/live` (contract v1), `{"status":"ok"}`; other fields are allowed. */
export const liveBodySchema = z.looseObject({ status: z.literal('ok') });

/** A check of `/health/ready`: a name or a code it does not know is fine; a missing key is not. */
const readyCheckSchema = z.object({
  name: z.string().min(1),
  status: z.string(),
  latency_ms: z.number().int().min(0).nullable(),
  error: z.string().nullable(),
});

/** L2: the body of `/health/ready`, `ok` (200) or `unavailable` (503), always with its checks. */
export const readyBodySchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.array(readyCheckSchema),
});

export type ReadyCheck = z.output<typeof readyCheckSchema>;
export type ReadyBody = z.output<typeof readyBodySchema>;
