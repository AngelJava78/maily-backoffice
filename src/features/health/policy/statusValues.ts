/** The states of a component that the Backoffice knows (data-model.md §2). */
export const COMPONENT_STATUSES = ['up', 'degraded', 'down', 'stopped', 'unknown'] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

/** The overall states of the platform that the Backoffice knows. */
export const OVERALL_STATUSES = ['ok', 'degraded', 'down', 'unknown'] as const;
export type OverallStatus = (typeof OVERALL_STATUSES)[number];

/** The kinds of component that the Backoffice knows. */
export const COMPONENT_KINDS = ['service', 'database', 'frontend', 'unknown'] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/** The states of a check that the Backoffice knows. */
export const CHECK_STATUSES = ['ok', 'error', 'unknown'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/** Whether `value` is one of `values`, the known values of a field. */
export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}

// A value the Backoffice does not know never makes a response invalid (FR-009): it becomes
// `unknown`, which the screens show with their generic text.

export function toComponentStatus(value: string): ComponentStatus {
  return isOneOf(COMPONENT_STATUSES, value) ? value : 'unknown';
}

export function toOverallStatus(value: string): OverallStatus {
  return isOneOf(OVERALL_STATUSES, value) ? value : 'unknown';
}

export function toComponentKind(value: string): ComponentKind {
  return isOneOf(COMPONENT_KINDS, value) ? value : 'unknown';
}

export function toCheckStatus(value: string): CheckStatus {
  return isOneOf(CHECK_STATUSES, value) ? value : 'unknown';
}
