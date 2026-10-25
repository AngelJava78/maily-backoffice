import { formatCount } from '@/shared/lib/formatCount';
import { messages } from '@/shared/messages/es';
import type { BadgeTone } from '@/shared/ui/Badge';
import type { IconName } from '@/shared/ui/iconRegistry';

import {
  isOneOf,
  type CheckStatus,
  type ComponentKind,
  type ComponentStatus,
  type OverallStatus,
} from './statusValues';

export type { CheckStatus, ComponentKind, ComponentStatus, OverallStatus } from './statusValues';

/** How a status is shown (research D12): text, tone and icon, so it is never told by color alone. */
export interface StatusPresentation {
  readonly label: string;
  readonly tone: BadgeTone;
  readonly icon: IconName;
}

const { health } = messages;

const COMPONENT_STATUS_PRESENTATION: Readonly<Record<ComponentStatus, StatusPresentation>> = {
  up: { label: health.status.up, tone: 'success', icon: 'status-up' },
  degraded: { label: health.status.degraded, tone: 'warning', icon: 'status-degraded' },
  down: { label: health.status.down, tone: 'danger', icon: 'status-down' },
  // Same tone as `unknown`, but an icon of its own.
  stopped: { label: health.status.stopped, tone: 'neutral', icon: 'status-stopped' },
  unknown: { label: health.status.unknown, tone: 'neutral', icon: 'status-unknown' },
};

const OVERALL_STATUS_PRESENTATION: Readonly<Record<OverallStatus, StatusPresentation>> = {
  ok: { label: health.overall.ok, tone: 'success', icon: 'status-up' },
  degraded: { label: health.overall.degraded, tone: 'warning', icon: 'status-degraded' },
  down: { label: health.overall.down, tone: 'danger', icon: 'status-down' },
  unknown: { label: health.overall.unknown, tone: 'neutral', icon: 'status-unknown' },
};

/** The error codes of a component that the contract defines (FR-016). */
const COMPONENT_ERROR_CODES = [
  'timeout',
  'connection_error',
  'dns_error',
  'host_not_allowed',
  'unexpected_status',
  'invalid_response',
  'response_too_large',
  'not_ready',
  'not_configured',
  'unexpected_error',
] as const;

/** The names in Spanish of the checks that the contract defines; any other is shown as it is. */
const CHECK_NAMES: ReadonlyMap<string, string> = new Map(Object.entries(health.checks.names));

export function componentStatusPresentation(status: ComponentStatus): StatusPresentation {
  return COMPONENT_STATUS_PRESENTATION[status];
}

export function overallStatusPresentation(status: OverallStatus): StatusPresentation {
  return OVERALL_STATUS_PRESENTATION[status];
}

/** What the error of a component means (FR-016); a code the Backoffice does not know, generically. */
export function describeComponentError(code: string): string {
  return isOneOf(COMPONENT_ERROR_CODES, code) ? health.errors[code] : health.errors.unknownCode;
}

export function checkNameLabel(name: string): string {
  return CHECK_NAMES.get(name) ?? name;
}

export function checkStatusLabel(status: CheckStatus): string {
  return health.checks[status];
}

export function kindLabel(kind: ComponentKind): string {
  return health.kinds[kind];
}

/** A latency in milliseconds, with the numbers of Mexico (FR-012); 0 is 0 ms (FR-014). */
export function latencyLabel(latencyMs: number | null): string {
  return latencyMs === null ? health.notAvailable : health.latency(formatCount(latencyMs));
}
