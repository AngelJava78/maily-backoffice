import { http, HttpResponse, type PathParams } from 'msw';

import { uuidOf } from '../../ids';
import type { Handle } from '../subscriptionsCatalog/handle';
import {
  CatalogError,
  validationError,
  type CatalogFieldError,
} from '../subscriptionsCatalog/model';
import type { RegisteredComponent } from './model';

/** The path of the registry, below the base of maily-system-api. */
export const REGISTRY_PATH = '/api/v1/monitored-components';

/** The codes of the integrated components, which nobody can register (FR-001 of system-api 005). */
const RESERVED_CODES: ReadonlySet<string> = new Set(['maily-system-api', 'database']);
const CODE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** What a modification may change: anything but the id, the dates and the deletion. */
const MODIFIABLE_FIELDS: ReadonlySet<string> = new Set([
  'code',
  'name',
  'kind',
  'base_url',
  'live_path',
  'ready_path',
  'info_path',
  'enabled',
  'sort_order',
]);

/** The settings of the registry that a test can change. */
export interface RegistrySettings {
  /** The hosts that may be monitored (`HEALTH_ALLOWED_HOSTS`); `null` allows every one. */
  allowedHosts: readonly string[] | null;
  /** The next number of `uuidOf` for a new component. */
  nextId: number;
}

/** A component as the API publishes it: the deletion is not published. */
export function toPublished(component: RegisteredComponent) {
  return {
    id: component.id,
    code: component.code,
    name: component.name,
    kind: component.kind,
    base_url: component.base_url,
    live_path: component.live_path,
    ready_path: component.ready_path,
    info_path: component.info_path,
    enabled: component.enabled,
    sort_order: component.sort_order,
    created_at: component.created_at,
    updated_at: component.updated_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPath(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.length <= 200 &&
    PATH_PATTERN.test(value) &&
    !value.startsWith('//') &&
    !value.split('/').some((segment) => segment === '.' || segment === '..')
  );
}

function isBaseUrl(value: unknown, allowedHosts: readonly string[] | null): boolean {
  if (typeof value !== 'string' || value.length > 255 || /[\\\s?#]/.test(value)) {
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
    url.password === '' &&
    (allowedHosts === null || allowedHosts.includes(url.hostname))
  );
}

/** Whether a datum follows the rules of the service (contracts/monitored-components.md). */
function isValidDatum(field: string, value: unknown, settings: RegistrySettings): boolean {
  switch (field) {
    case 'code':
      return (
        typeof value === 'string' &&
        value.length >= 2 &&
        value.length <= 50 &&
        CODE_PATTERN.test(value)
      );
    case 'name':
      return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100;
    case 'kind':
      return value === 'service' || value === 'frontend';
    case 'base_url':
      return isBaseUrl(value, settings.allowedHosts);
    case 'live_path':
      return isPath(value);
    case 'ready_path':
    case 'info_path':
      return value === null || isPath(value);
    case 'enabled':
      return typeof value === 'boolean';
    case 'sort_order':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9999;
    default:
      return false;
  }
}

function invalidData(data: Readonly<Record<string, unknown>>, settings: RegistrySettings) {
  return Object.entries(data)
    .filter(([field, value]) => !isValidDatum(field, value, settings))
    .map(([field]): CatalogFieldError => ({ field, message: 'El dato no es válido.' }));
}

/** A microservice needs its readiness route; a frontend has none (FR-036 of system-api 005). */
function checkCombination(component: RegisteredComponent): void {
  const fits =
    component.kind === 'service' ? component.ready_path !== null : component.ready_path === null;
  if (!fits) {
    throw validationError([
      { field: 'ready_path', message: 'La ruta no corresponde al tipo del componente.' },
    ]);
  }
}

function checkCode(components: readonly RegisteredComponent[], code: string, id?: string) {
  const taken = components.some(
    (component) => component.deleted_at === null && component.code === code && component.id !== id,
  );
  if (taken || RESERVED_CODES.has(code)) {
    throw new CatalogError(
      409,
      'monitored_component_code_already_exists',
      'Ya existe un componente con ese código.',
    );
  }
}

function notFound(): CatalogError {
  return new CatalogError(404, 'monitored_component_not_found', 'El componente no existe.');
}

/** The component of the route, not deleted; a 422 for an id that is not one, a 404 otherwise. */
function findComponent(
  components: readonly RegisteredComponent[],
  params: PathParams,
): RegisteredComponent {
  const id = String(params.componentId);
  if (!UUID_PATTERN.test(id)) {
    throw validationError([{ field: 'component_id', message: 'El identificador no es válido.' }]);
  }
  const component = components.find(
    (candidate) => candidate.id === id && candidate.deleted_at === null,
  );
  if (component === undefined) {
    throw notFound();
  }
  return component;
}

/** The components the list publishes: the ones not deleted, by order and code. */
export function listed(components: readonly RegisteredComponent[]): RegisteredComponent[] {
  return components
    .filter((component) => component.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
}

/**
 * The five operations of `/api/v1/monitored-components` (contracts/monitored-components.md), in
 * the order of the service: who is asking, the failures a test injected and the permission (the
 * wrapper), then the data, the existence, the resulting combination and the code.
 */
export function registryHandlers({
  baseUrl,
  handle,
  components,
  settings,
}: {
  readonly baseUrl: string;
  readonly handle: Handle;
  readonly components: RegisteredComponent[];
  readonly settings: RegistrySettings;
}) {
  const collection = `${baseUrl}${REGISTRY_PATH}`;
  const item = `${collection}/:componentId`;

  return [
    http.get(
      collection,
      handle('health:read', () => HttpResponse.json(listed(components).map(toPublished))),
    ),
    http.get(
      item,
      handle('health:read', ({ params }) =>
        HttpResponse.json(toPublished(findComponent(components, params))),
      ),
    ),
    http.post(
      collection,
      handle('health:write', ({ body }) => {
        if (!isRecord(body)) {
          throw validationError([{ field: 'body', message: 'El cuerpo no es válido.' }]);
        }
        const kind = body.kind === 'frontend' ? 'frontend' : 'service';
        const data: Record<string, unknown> = {
          ready_path: kind === 'service' ? '/health/ready' : null,
          info_path: kind === 'service' ? '/info' : null,
          enabled: true,
          sort_order: 0,
          ...body,
        };
        const missing = ['code', 'name', 'kind', 'base_url', 'live_path']
          .filter((field) => !(field in data))
          .map((field): CatalogFieldError => ({ field, message: 'El dato es obligatorio.' }));
        const invalid = [...missing, ...invalidData(data, settings)];
        if (invalid.length > 0) {
          throw validationError(invalid);
        }
        const now = new Date().toISOString();
        const created: RegisteredComponent = {
          id: uuidOf(settings.nextId),
          code: String(data.code),
          name: String(data.name).trim(),
          kind,
          base_url: String(data.base_url),
          live_path: String(data.live_path),
          ready_path: typeof data.ready_path === 'string' ? data.ready_path : null,
          info_path: typeof data.info_path === 'string' ? data.info_path : null,
          enabled: data.enabled === true,
          sort_order: Number(data.sort_order),
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        checkCombination(created);
        checkCode(components, created.code);
        settings.nextId += 1;
        components.push(created);
        return HttpResponse.json(toPublished(created), { status: 201 });
      }),
    ),
    http.patch(
      item,
      handle('health:update', ({ params, body }) => {
        if (!isRecord(body) || Object.keys(body).length === 0) {
          throw validationError([{ field: 'body', message: 'No hay datos para modificar.' }]);
        }
        const unknownFields = Object.keys(body)
          .filter((field) => !MODIFIABLE_FIELDS.has(field))
          .map((field): CatalogFieldError => ({ field, message: 'El dato no se puede cambiar.' }));
        const invalid = [...unknownFields, ...invalidData(body, settings)];
        if (invalid.length > 0) {
          throw validationError(invalid);
        }
        const current = findComponent(components, params);
        const route = (field: 'ready_path' | 'info_path'): string | null => {
          if (!(field in body)) {
            return current[field];
          }
          const value = body[field];
          return typeof value === 'string' ? value : null;
        };
        // The data were checked above: each one is of its type when it is there.
        const updated: RegisteredComponent = {
          ...current,
          code: typeof body.code === 'string' ? body.code : current.code,
          name: typeof body.name === 'string' ? body.name.trim() : current.name,
          kind: body.kind === 'service' || body.kind === 'frontend' ? body.kind : current.kind,
          base_url: typeof body.base_url === 'string' ? body.base_url : current.base_url,
          live_path: typeof body.live_path === 'string' ? body.live_path : current.live_path,
          ready_path: route('ready_path'),
          info_path: route('info_path'),
          enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
          sort_order: typeof body.sort_order === 'number' ? body.sort_order : current.sort_order,
          updated_at: new Date().toISOString(),
        };
        checkCombination(updated);
        checkCode(components, updated.code, updated.id);
        components.splice(components.indexOf(current), 1, updated);
        return HttpResponse.json(toPublished(updated));
      }),
    ),
    http.delete(
      item,
      handle('health:delete', ({ params }) => {
        const current = findComponent(components, params);
        components.splice(components.indexOf(current), 1, {
          ...current,
          deleted_at: new Date().toISOString(),
        });
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
