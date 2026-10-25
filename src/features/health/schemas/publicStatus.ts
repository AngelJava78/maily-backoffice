import { z } from 'zod';

import { toComponentKind, toComponentStatus, toOverallStatus } from '../policy/statusValues';

const isoDateTime = z.iso.datetime({ offset: true });

/**
 * A component of the public status: only its code, name, kind, status and next start (FR-057). The
 * schema has nothing else, so whatever else arrived is discarded (SC-014); a status or a kind the
 * Backoffice does not know is kept as unknown, without breaking the answer.
 */
const platformComponentSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    kind: z.string().transform(toComponentKind),
    status: z.string().transform(toComponentStatus),
    next_start_at: isoDateTime.nullable(),
  })
  .transform((dto) => ({
    code: dto.code,
    name: dto.name,
    kind: dto.kind,
    status: dto.status,
    nextStartAt: dto.next_start_at,
  }));

/** The answer of `GET /health/status` (contracts/public-status.md, P1). */
export const publicStatusSchema = z
  .object({
    status: z.string().transform(toOverallStatus),
    checked_at: isoDateTime,
    components: z.array(platformComponentSchema),
  })
  .transform((dto) => ({
    status: dto.status,
    checkedAt: dto.checked_at,
    components: dto.components,
  }));

export type PlatformStatus = z.output<typeof publicStatusSchema>;
export type PlatformComponent = PlatformStatus['components'][number];
export type PublicStatusDto = z.input<typeof publicStatusSchema>;
