import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from '../usersDirectory/handle';
import { toRoleRecordDto, type DirectoryModel } from '../usersDirectory/model';
import { issue, readRoleId, validationError, type FieldIssue } from '../usersDirectory/validation';

const KNOWN_CREATE_FIELDS: ReadonlySet<string> = new Set(['name', 'description', 'type_id']);
const KNOWN_UPDATE_FIELDS: ReadonlySet<string> = new Set(['name', 'description']);
const TYPE_NOT_CHANGEABLE: FieldIssue = {
  field: 'type_id',
  message: 'El tipo de un role se indica al crearlo y no se puede cambiar.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A required name: 1 to 50 characters once trimmed (contracts/roles-service.md). */
function requiredName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 50 ? trimmed : null;
}

/** `undefined` means invalid; `null` or a trimmed string (never `''`) otherwise. */
function readOptionalDescription(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.length > 500) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Strict on purpose (research, role.py R4): `true`, `1.0` or `"1"` are not the integer 1 or 2. */
function readTypeId(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value === 1 || value === 2 ? value : null;
}

function readNewRole(body: unknown): { name: string; description: string | null; typeId: number } {
  if (!isRecord(body)) {
    throw validationError([issue('body')]);
  }
  const issues: FieldIssue[] = Object.keys(body)
    .filter((key) => !KNOWN_CREATE_FIELDS.has(key))
    .map(issue);

  const name = requiredName(body.name);
  if (name === null) {
    issues.push(issue('name'));
  }
  const description = readOptionalDescription(body.description);
  if (description === undefined) {
    issues.push(issue('description'));
  }
  const typeId = readTypeId(body.type_id);
  if (typeId === null) {
    issues.push(issue('type_id'));
  }
  if (issues.length > 0 || name === null || typeId === null) {
    throw validationError(issues);
  }
  return { name, description: description ?? null, typeId };
}

function readRoleChanges(body: unknown): { name?: string; description?: string | null } {
  if (!isRecord(body)) {
    throw validationError([issue('body')]);
  }
  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw validationError([issue('body')]);
  }
  const issues: FieldIssue[] = keys
    .filter((key) => !KNOWN_UPDATE_FIELDS.has(key))
    .map((key) => (key === 'type_id' || key === 'type' ? TYPE_NOT_CHANGEABLE : issue(key)));

  const changes: { name?: string; description?: string | null } = {};
  if ('name' in body) {
    const name = requiredName(body.name);
    if (name === null) {
      issues.push(issue('name'));
    } else {
      changes.name = name;
    }
  }
  if ('description' in body) {
    const description = readOptionalDescription(body.description);
    if (description === undefined) {
      issues.push(issue('description'));
    } else {
      changes.description = description;
    }
  }
  if (issues.length > 0) {
    throw validationError(issues);
  }
  return changes;
}

/** `POST/PATCH/DELETE /api/v1/roles` (feature 013; contracts/roles-service.md). */
export function roleHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  const roles = `${USERS_API_BASE_URL}/api/v1/roles`;

  return [
    http.post(
      roles,
      handle('roles:write', ({ body }) => {
        const role = model.createRole(readNewRole(body));
        return HttpResponse.json(toRoleRecordDto(role), {
          status: 201,
          headers: { Location: `${roles}/${role.id}` },
        });
      }),
    ),
    http.patch(
      `${roles}/:roleId`,
      handle('roles:update', ({ params, body }) => {
        const role = model.updateRole(readRoleId(params), readRoleChanges(body));
        return HttpResponse.json(toRoleRecordDto(role));
      }),
    ),
    http.delete(
      `${roles}/:roleId`,
      handle('roles:delete', ({ params }) => {
        model.deleteRole(readRoleId(params));
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
