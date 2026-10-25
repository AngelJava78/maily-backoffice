import { z } from 'zod';

import {
  toCheckStatus,
  toComponentKind,
  toComponentStatus,
  toOverallStatus,
} from '../policy/statusValues';

// The shape is strict and the values are tolerant (research D5): a missing key or one of another
// type makes the response break the contract, so nothing of it is shown (FR-009), while a state, a
// kind, a check or an error code the Backoffice does not know is kept and shown as unknown. Only
// the build data, the latency and the last check of a component may be missing, because the
// aggregator copies them from each component and the contract allows them unknown (FR-014).

const isoDateTime = z.iso.datetime({ offset: true });

/** `null` for a missing, blank or `unknown` text; the text, trimmed, otherwise. */
function knownText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' || trimmed.toLowerCase() === 'unknown' ? null : trimmed;
}

/** A text the component may not know, such as its version: «No disponible» when it does not. */
const unknownableText = z.string().nullish().transform(knownText);

/** A date the component may not know: also «No disponible» when it is not a valid date. */
const unknownableDate = unknownableText.transform((value) =>
  value !== null && isoDateTime.safeParse(value).success ? value : null,
);

/** Milliseconds, 0 included; a negative or fractional latency breaks the contract. */
const latency = z
  .number()
  .int()
  .min(0)
  .nullish()
  .transform((value) => value ?? null);

const healthCheckSchema = z
  .object({
    name: z.string().min(1),
    status: z.string().transform(toCheckStatus),
    latency_ms: latency,
    error: z.string().nullable(),
  })
  .transform((dto) => ({
    name: dto.name,
    status: dto.status,
    latencyMs: dto.latency_ms,
    error: dto.error,
  }));

const healthComponentSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    kind: z.string().transform(toComponentKind),
    status: z.string().transform(toComponentStatus),
    latency_ms: latency,
    checked_at: unknownableDate,
    version: unknownableText,
    commit: unknownableText,
    build_date: unknownableDate,
    environment: unknownableText,
    checks: z.array(healthCheckSchema),
    error: z.string().nullable(),
    next_start_at: isoDateTime.nullable(),
  })
  .transform((dto) => ({
    code: dto.code,
    name: dto.name,
    kind: dto.kind,
    status: dto.status,
    latencyMs: dto.latency_ms,
    checkedAt: dto.checked_at,
    version: dto.version,
    commit: dto.commit,
    buildDate: dto.build_date,
    environment: dto.environment,
    checks: dto.checks,
    error: dto.error,
    nextStartAt: dto.next_start_at,
  }));

/** The response of `GET /api/v1/health` (contracts/health-aggregator.md). */
export const healthResultSchema = z
  .object({
    status: z.string().transform(toOverallStatus),
    checked_at: isoDateTime,
    registry_available: z.boolean(),
    components: z.array(healthComponentSchema),
  })
  .transform((dto) => ({
    status: dto.status,
    checkedAt: dto.checked_at,
    registryAvailable: dto.registry_available,
    components: dto.components,
  }));

export type HealthResult = z.output<typeof healthResultSchema>;
export type HealthComponent = HealthResult['components'][number];
export type HealthCheck = HealthComponent['checks'][number];
export type HealthResultDto = z.input<typeof healthResultSchema>;
