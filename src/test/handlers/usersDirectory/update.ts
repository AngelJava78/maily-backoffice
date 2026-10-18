import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import { toUserDto, type DirectoryModel, type UserChanges } from './model';
import { issue, readUserId, validationError, type FieldIssue } from './validation';

const KNOWN_FIELDS: ReadonlySet<string> = new Set([
  'first_name',
  'paternal_last_name',
  'maternal_last_name',
]);

/** A name that is changed: it cannot end up empty, and it has at most 100 characters. */
function changedName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 ? trimmed : null;
}

/**
 * Reads the body of the change as the service does (`UserUpdate`): at least one of the three
 * names and nothing else, so the email and `auth0_id` are refused, not ignored.
 */
function readChanges(body: unknown): UserChanges {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError([issue('body')]);
  }
  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw validationError([issue('body')]);
  }
  const issues: FieldIssue[] = keys.filter((key) => !KNOWN_FIELDS.has(key)).map(issue);
  const changes: {
    firstName?: string;
    paternalLastName?: string;
    maternalLastName?: string | null;
  } = {};

  if ('first_name' in body) {
    const firstName = changedName(body.first_name);
    if (firstName === null) {
      issues.push(issue('first_name'));
    } else {
      changes.firstName = firstName;
    }
  }
  if ('paternal_last_name' in body) {
    const paternalLastName = changedName(body.paternal_last_name);
    if (paternalLastName === null) {
      issues.push(issue('paternal_last_name'));
    } else {
      changes.paternalLastName = paternalLastName;
    }
  }
  if ('maternal_last_name' in body) {
    const maternal = body.maternal_last_name;
    if (maternal === null || (typeof maternal === 'string' && maternal.trim().length <= 100)) {
      changes.maternalLastName = maternal;
    } else {
      issues.push(issue('maternal_last_name'));
    }
  }

  if (issues.length > 0) {
    throw validationError(issues);
  }
  return changes;
}

/** U5: `PATCH /api/v1/users/{id}`, which changes the names of an active user (users:update). */
export function updateHandlers(model: DirectoryModel, handle: Handle): HttpHandler[] {
  return [
    http.patch(
      `${USERS_API_BASE_URL}/api/v1/users/:userId`,
      handle('users:update', ({ params, body }) => {
        const userId = readUserId(params);
        const changes = readChanges(body);
        return HttpResponse.json(toUserDto(model.updateUser(userId, changes)));
      }),
    ),
  ];
}
