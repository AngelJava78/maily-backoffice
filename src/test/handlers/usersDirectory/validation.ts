import type { PathParams } from 'msw';

import { DirectoryError } from './model';

/** The pattern of an email that the service accepts; the simulator keeps its own copy of it. */
export const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:[.][A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
}

/** The 422 of the service: `validation_error` with the fields that are not valid. */
export function validationError(issues: readonly FieldIssue[]): DirectoryError {
  return new DirectoryError(422, 'validation_error', 'Hay datos que no son válidos.', issues);
}

export const issue = (field: string): FieldIssue => ({
  field,
  message: `El valor de ${field} no es válido.`,
});

/**
 * A whole number of a query parameter. An absent one takes its default; one that is not a whole
 * number or is out of range is reported in `issues` (and the default stands in for it).
 */
export function readInteger(
  text: string | null,
  rule: {
    readonly field: string;
    readonly fallback: number;
    readonly min: number;
    readonly max?: number;
  },
  issues: FieldIssue[],
): number {
  if (text === null) {
    return rule.fallback;
  }
  const value = /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
  if (Number.isNaN(value) || value < rule.min || (rule.max !== undefined && value > rule.max)) {
    issues.push(issue(rule.field));
    return rule.fallback;
  }
  return value;
}

function readPathId(params: PathParams, key: string, field: string): number {
  const raw = params[key];
  const text = typeof raw === 'string' ? raw : '';
  if (!/^[1-9]\d*$/.test(text)) {
    throw validationError([issue(field)]);
  }
  return Number(text);
}

const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The `{user_id}` of the path: a UUID written as 8-4-4-4-12 hexadecimal digits, or a 422. */
export function readUserId(params: PathParams): string {
  const raw = params.userId;
  const text = typeof raw === 'string' ? raw : '';
  if (!CANONICAL_UUID.test(text)) {
    throw validationError([issue('user_id')]);
  }
  return text.toLowerCase();
}

/** The `{role_id}` of the path: a whole number from 1, or a 422. */
export const readRoleId = (params: PathParams): number => readPathId(params, 'roleId', 'role_id');

/** The `{permission_id}` of the path (feature 014): a whole number from 1, or a 422. */
export const readPermissionId = (params: PathParams): number =>
  readPathId(params, 'permissionId', 'permission_id');

/** An email that the service would accept: with the format and at most 255 characters. */
export const isValidEmail = (email: string): boolean =>
  email.length > 0 && email.length <= 255 && EMAIL_PATTERN.test(email);
