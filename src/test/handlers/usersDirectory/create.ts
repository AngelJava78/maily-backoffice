import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { IdentityFailures } from './behaviors';
import type { Handle } from './handle';
import { checkNewAccount } from './identity';
import { DirectoryError, toUserDto, type DirectoryModel, type NewUser } from './model';
import { isValidEmail, issue, validationError, type FieldIssue } from './validation';

const KNOWN_FIELDS: ReadonlySet<string> = new Set([
  'email',
  'password',
  'first_name',
  'paternal_last_name',
  'maternal_last_name',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A required name: a text of 1 to 100 characters once trimmed. */
function requiredName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 ? trimmed : null;
}

/**
 * Reads the body of the creation as the service does (`UserCreate`): the five fields it knows and
 * nothing else, so `auth0_id`, which the provider assigns, is refused. Every field that is wrong
 * is reported, not only the first.
 */
function readNewUser(body: unknown): NewUser {
  if (!isRecord(body)) {
    throw validationError([issue('body')]);
  }
  const issues: FieldIssue[] = Object.keys(body)
    .filter((key) => !KNOWN_FIELDS.has(key))
    .map(issue);

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    issues.push(issue('email'));
  }
  if (typeof body.password !== 'string' || body.password === '') {
    issues.push(issue('password'));
  }
  const firstName = requiredName(body.first_name);
  if (firstName === null) {
    issues.push(issue('first_name'));
  }
  const paternalLastName = requiredName(body.paternal_last_name);
  if (paternalLastName === null) {
    issues.push(issue('paternal_last_name'));
  }
  const maternal = body.maternal_last_name;
  const maternalLastName = typeof maternal === 'string' ? maternal.trim() : null;
  if (
    (maternal !== undefined && maternal !== null && typeof maternal !== 'string') ||
    (maternalLastName !== null && maternalLastName.length > 100)
  ) {
    issues.push(issue('maternal_last_name'));
  }

  if (issues.length > 0 || firstName === null || paternalLastName === null) {
    throw validationError(issues);
  }
  return { email, firstName, paternalLastName, maternalLastName };
}

/** U4: `POST /api/v1/users`, which also creates the access account of the person (users:write). */
export function createHandlers(
  model: DirectoryModel,
  handle: Handle,
  identity: IdentityFailures,
): HttpHandler[] {
  const users = `${USERS_API_BASE_URL}/api/v1/users`;

  return [
    http.post(
      users,
      handle('users:write', ({ body }) => {
        const newUser = readNewUser(body);
        if (model.findByEmail(newUser.email) !== undefined) {
          throw new DirectoryError(
            409,
            'user_email_already_registered',
            'El correo ya está registrado.',
          );
        }
        checkNewAccount(identity, newUser.email);
        const user = model.createUser(newUser);
        return HttpResponse.json(toUserDto(user), {
          status: 201,
          headers: { Location: `${users}/${user.id}` },
        });
      }),
    ),
  ];
}
