import { DirectoryError, type DirectoryModel } from './model';

const TEST_TOKEN_PREFIX = 'test-token:';

/**
 * Who is asking, from the token the tests give, `Bearer test-token:<sub>`. The service does the
 * same with the real token: no header or another format is a 401 before anything else is looked at.
 */
export function authenticate(request: Request): string {
  const header = request.headers.get('authorization');
  if (header === null) {
    throw new DirectoryError(401, 'unauthenticated', 'Falta el token.');
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token?.startsWith(TEST_TOKEN_PREFIX)) {
    throw new DirectoryError(401, 'invalid_token', 'El token no es válido.');
  }
  return token.slice(TEST_TOKEN_PREFIX.length);
}

/**
 * The service reads the permissions of the operator from its data on every request: someone who is
 * not registered, or not active, or whose roles do not give the permission, gets a 403. It happens
 * before the request is validated, so a 403 arrives before a 422 or a 404.
 */
export function requirePermission(sub: string, model: DirectoryModel, permission: string): void {
  if (!model.permissionsOf(sub).has(permission)) {
    throw new DirectoryError(
      403,
      'permission_denied',
      'No tienes permiso para realizar esta acción.',
    );
  }
}
