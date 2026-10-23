import type { UsersDirectoryMock } from '../usersDirectory';
import { ModuleCatalogError } from './model';

const TEST_TOKEN_PREFIX = 'test-token:';

/**
 * Who is asking and what they may do. Modules and permissions are resources of the same users
 * service (research D2): the simulator checks the permission directly against the directory mock's
 * own data, the same data `me` answers from, instead of pretending to ask a separate service.
 *
 * Without `directory` (tests of pieces that do not care about authorization) every token has every
 * permission.
 */
export function createAuthorization(directory?: UsersDirectoryMock) {
  return {
    /** The `sub` of the token the tests give, `Bearer test-token:<sub>`; a 401 otherwise. */
    authenticate(request: Request): string {
      const header = request.headers.get('authorization');
      if (header === null) {
        throw new ModuleCatalogError(
          401,
          'unauthenticated',
          'Debe iniciar sesión para usar esta operación.',
        );
      }
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token?.startsWith(TEST_TOKEN_PREFIX)) {
        throw new ModuleCatalogError(401, 'invalid_token', 'El token de acceso no es válido.');
      }
      return token.slice(TEST_TOKEN_PREFIX.length);
    },

    /** The permission, checked before the request is validated: a 403 arrives before a 422 or a 404. */
    requirePermission(sub: string, permission: string): void {
      if (directory !== undefined && !directory.state.permissionsOf(sub).has(permission)) {
        throw new ModuleCatalogError(
          403,
          'permission_denied',
          `No tiene permiso para realizar esta operación. Permiso requerido: ${permission}.`,
        );
      }
    },
  };
}

export type Authorization = ReturnType<typeof createAuthorization>;
