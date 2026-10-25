import type { HealthResultDto } from '@/features/health/schemas/healthResult';
import type { MonitoredComponentDto } from '@/features/health/schemas/monitoredComponent';

import { healthCheckDto, healthComponentDto, healthResultDto } from '../../factories';

type HealthComponentDto = HealthResultDto['components'][number];

/** A component of the registry as the simulator keeps it: the API record plus its logical deletion. */
export interface RegisteredComponent {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: 'service' | 'frontend';
  readonly base_url: string;
  readonly live_path: string;
  readonly ready_path: string | null;
  readonly info_path: string | null;
  readonly enabled: boolean;
  readonly sort_order: number;
  readonly created_at: string;
  readonly updated_at: string;
  /** Not published by the API: a deleted component no longer exists for it. */
  readonly deleted_at: string | null;
}

/** A component that a test registers before anything else: as the API publishes it, maybe deleted. */
export type RegisteredComponentSeed = MonitoredComponentDto & {
  readonly deleted_at?: string | null;
};

/** The record the simulator keeps of a seed. */
export function fromSeed(seed: RegisteredComponentSeed): RegisteredComponent {
  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    kind: seed.kind === 'frontend' ? 'frontend' : 'service',
    base_url: seed.base_url,
    live_path: seed.live_path,
    ready_path: seed.ready_path,
    info_path: seed.info_path,
    enabled: seed.enabled,
    sort_order: seed.sort_order,
    created_at: seed.created_at,
    updated_at: seed.updated_at,
    deleted_at: seed.deleted_at ?? null,
  };
}

/** When every aggregation of the simulator ends: the tests do not depend on the clock. */
export const AGGREGATED_AT = '2026-10-24T16:00:00Z';

/**
 * The two integrated components, always present and up (FR-011 and FR-016 of system-api 005): the
 * ones of `healthResultDto`, so the simulator answers by default what that factory gives.
 */
export function integratedComponents(): HealthComponentDto[] {
  return [...healthResultDto().components];
}

/** The registered components the aggregator checks: enabled and not deleted, by order and code. */
export function visibleComponents(
  registered: readonly RegisteredComponent[],
): RegisteredComponent[] {
  return registered
    .filter((component) => component.enabled && component.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
}

/** The overall status with the rule of the aggregator (FR-017 of system-api 005). */
export function overallStatusOf(components: readonly HealthComponentDto[]): string {
  if (components.some((component) => component.status === 'down')) {
    return 'down';
  }
  const notUp = ['degraded', 'stopped', 'unknown'];
  return components.some((component) => notUp.includes(component.status)) ? 'degraded' : 'ok';
}

/**
 * The result of an aggregation: the integrated components and then the visible registered ones,
 * each up unless a test changed it, with the overall status of the aggregator.
 */
export function resultFrom(
  registered: readonly RegisteredComponent[],
  options: {
    readonly registryAvailable: boolean;
    readonly changes: ReadonlyMap<string, Partial<HealthComponentDto>>;
  },
): HealthResultDto {
  const components = [
    ...integratedComponents(),
    ...visibleComponents(registered).map((component) =>
      healthComponentDto({
        code: component.code,
        name: component.name,
        kind: component.kind,
        checks: component.kind === 'service' ? [healthCheckDto()] : [],
      }),
    ),
  ].map((component) => ({ ...component, ...options.changes.get(component.code) }));

  return {
    status: overallStatusOf(components),
    checked_at: AGGREGATED_AT,
    registry_available: options.registryAvailable,
    components,
  };
}
