import { z } from 'zod';

import { isOneOf } from '../policy/statusValues';

/** The kinds a registered component can have: the database is only built in (FR-036). */
export const REGISTERED_KINDS = ['service', 'frontend'] as const;
export type RegisteredKind = (typeof REGISTERED_KINDS)[number];

const isoDateTime = z.iso.datetime({ offset: true });

/**
 * A component of the registry (contracts/monitored-components.md, `MonitoredComponentRead`). A
 * kind the Backoffice does not know never breaks the answer: it is shown as «Componente».
 */
export const monitoredComponentSchema = z
  .object({
    id: z.uuid(),
    code: z.string().min(1),
    name: z.string().min(1),
    kind: z
      .string()
      .transform((kind): RegisteredKind | 'unknown' =>
        isOneOf(REGISTERED_KINDS, kind) ? kind : 'unknown',
      ),
    base_url: z.string().min(1),
    live_path: z.string().min(1),
    ready_path: z.string().nullable(),
    info_path: z.string().nullable(),
    enabled: z.boolean(),
    sort_order: z.number().int(),
    created_at: isoDateTime,
    updated_at: isoDateTime,
  })
  .transform((dto) => ({
    id: dto.id,
    code: dto.code,
    name: dto.name,
    kind: dto.kind,
    baseUrl: dto.base_url,
    livePath: dto.live_path,
    readyPath: dto.ready_path,
    infoPath: dto.info_path,
    enabled: dto.enabled,
    sortOrder: dto.sort_order,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }));

/** R1: every component that is not deleted, as an array without a wrapper, in the service order. */
export const monitoredComponentListSchema = z.array(monitoredComponentSchema);

export type MonitoredComponent = z.output<typeof monitoredComponentSchema>;
export type MonitoredComponentDto = z.input<typeof monitoredComponentSchema>;
