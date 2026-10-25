import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import type { MonitoredComponent, RegisteredKind } from './monitoredComponent';

const text = messages.health.registry.form;

const MAX_NAME_LENGTH = 100;
const MAX_BASE_URL_LENGTH = 255;
const MAX_PATH_LENGTH = 200;
const MAX_SORT_ORDER = 9999;

/** Lower case, digits and hyphens; a letter first; no hyphen at the end nor two in a row. */
const CODE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** The pattern of the OpenAPI of system-api 005 for a route. */
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$/;

/** The routes the v1 contract proposes to a microservice (FR-036). */
export const SERVICE_ROUTES = {
  livePath: '/health/live',
  readyPath: '/health/ready',
  infoPath: '/info',
} as const;

function isBaseUrl(value: string): boolean {
  // A browser reads a backslash as a slash and whitespace is stripped from URLs; `?` and `#`
  // open parameters and a fragment, even empty ones.
  if (value.length > MAX_BASE_URL_LENGTH || /[\\\s?#]/.test(value)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.hostname !== '' &&
    url.username === '' &&
    url.password === ''
  );
}

function isPath(value: string): boolean {
  return (
    value.length <= MAX_PATH_LENGTH &&
    PATH_PATTERN.test(value) &&
    !value.startsWith('//') &&
    !value.split('/').some((segment) => segment === '.' || segment === '..')
  );
}

/** A route that the kind needs: required, and in the format of the contract. */
function checkPath(
  ctx: z.RefinementCtx,
  field: 'livePath' | 'readyPath' | 'infoPath',
  value: string,
  required: boolean,
): void {
  if (value === '') {
    if (required) {
      ctx.addIssue({ code: 'custom', path: [field], message: text.required });
    }
    return;
  }
  if (!isPath(value)) {
    ctx.addIssue({ code: 'custom', path: [field], message: text.path });
  }
}

// None of these schemas transforms its value (`trim` does not change the type), so what the form
// holds and what it submits have the same type. No check aborts the others: Zod 4 would then skip
// the checks of the routes, which must be told too before sending (FR-038). The form shows the
// first error of each field, so an empty one is told as required and not also as invalid. The
// uniqueness of the code and the allowed domains are the service's to decide.
export const componentFormSchema = z
  .object({
    name: z.string().trim().min(1, text.required).max(MAX_NAME_LENGTH, text.name),
    code: z
      .string()
      .min(1, text.required)
      .min(2, text.code)
      .max(50, text.code)
      .regex(CODE_PATTERN, text.code),
    kind: z.enum(['service', 'frontend'], { error: text.required }),
    baseUrl: z.string().min(1, text.required).refine(isBaseUrl, text.baseUrl),
    livePath: z.string(),
    readyPath: z.string(),
    infoPath: z.string(),
    enabled: z.boolean(),
    sortOrder: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || (/^\d{1,4}$/.test(value) && Number(value) <= MAX_SORT_ORDER),
        text.sortOrder,
      ),
  })
  .superRefine((values, ctx) => {
    // A microservice needs its three routes; a frontend, its health route, and the information one
    // is up to it. A frontend has no readiness route, so whatever that field holds is not checked.
    const isService = values.kind === 'service';
    checkPath(ctx, 'livePath', values.livePath, true);
    if (isService) {
      checkPath(ctx, 'readyPath', values.readyPath, true);
    }
    checkPath(ctx, 'infoPath', values.infoPath, isService);
  });

export type ComponentFormValues = z.infer<typeof componentFormSchema>;

/** What a new component starts with: the routes the kind proposes, enabled (FR-036). */
export function newComponentFormValues(kind: RegisteredKind): ComponentFormValues {
  return {
    name: '',
    code: '',
    kind,
    baseUrl: '',
    ...(kind === 'service' ? SERVICE_ROUTES : { livePath: '', readyPath: '', infoPath: '' }),
    enabled: true,
    sortOrder: '',
  };
}

/** The values the edition opens with: those of the component. */
export function toFormValues(component: MonitoredComponent): ComponentFormValues {
  return {
    name: component.name,
    code: component.code,
    // An unknown kind cannot be edited as such; the code and the kind are only shown (FR-037).
    kind: component.kind === 'frontend' ? 'frontend' : 'service',
    baseUrl: component.baseUrl,
    livePath: component.livePath,
    readyPath: component.readyPath ?? '',
    infoPath: component.infoPath ?? '',
    enabled: component.enabled,
    sortOrder: String(component.sortOrder),
  };
}

/** The body of `POST /api/v1/monitored-components` (R3). */
export interface CreateComponentPayload {
  readonly code: string;
  readonly name: string;
  readonly kind: RegisteredKind;
  readonly base_url: string;
  readonly live_path: string;
  readonly ready_path: string | null;
  readonly info_path: string | null;
  readonly enabled: boolean;
  readonly sort_order: number;
}

/** The body of `PATCH /api/v1/monitored-components/{id}` (R4): only what changed. */
export type UpdateComponentPayload = Partial<
  Pick<
    CreateComponentPayload,
    'name' | 'base_url' | 'live_path' | 'ready_path' | 'info_path' | 'enabled' | 'sort_order'
  >
>;

function sortOrderOf(values: ComponentFormValues): number {
  const sortOrder = values.sortOrder.trim();
  return sortOrder === '' ? 0 : Number(sortOrder);
}

/** An optional route: `null` when it is empty. */
function optionalPath(value: string): string | null {
  return value === '' ? null : value;
}

/**
 * The whole component a creation sends (R3): a frontend sends no readiness route and, without an
 * information route, `null`; an empty order is 0.
 */
export function toCreatePayload(values: ComponentFormValues): CreateComponentPayload {
  const isService = values.kind === 'service';
  return {
    code: values.code,
    name: values.name.trim(),
    kind: values.kind,
    base_url: values.baseUrl,
    live_path: values.livePath,
    ready_path: isService ? values.readyPath : null,
    info_path: optionalPath(values.infoPath),
    enabled: values.enabled,
    sort_order: sortOrderOf(values),
  };
}

/**
 * Only what changed since the form was opened, never the code nor the kind (FR-037), or `null`
 * when nothing changed and nothing has to be sent: an empty modification is a 422 (research D15).
 */
export function toUpdatePayload(
  original: MonitoredComponent,
  values: ComponentFormValues,
): UpdateComponentPayload | null {
  const name = values.name.trim();
  const sortOrder = sortOrderOf(values);
  const infoPath = optionalPath(values.infoPath);
  const isService = original.kind !== 'frontend';
  const payload: UpdateComponentPayload = {
    ...(name === original.name ? {} : { name }),
    ...(values.baseUrl === original.baseUrl ? {} : { base_url: values.baseUrl }),
    ...(values.livePath === original.livePath ? {} : { live_path: values.livePath }),
    ...(isService && values.readyPath !== (original.readyPath ?? '')
      ? { ready_path: values.readyPath }
      : {}),
    ...(infoPath === original.infoPath ? {} : { info_path: infoPath }),
    ...(values.enabled === original.enabled ? {} : { enabled: values.enabled }),
    ...(sortOrder === original.sortOrder ? {} : { sort_order: sortOrder }),
  };
  return Object.keys(payload).length === 0 ? null : payload;
}
