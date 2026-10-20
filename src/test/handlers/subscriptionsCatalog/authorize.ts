import type { UsersDirectoryMock } from '../usersDirectory';
import { CatalogError } from './model';

const TEST_TOKEN_PREFIX = 'test-token:';

/**
 * Who is asking and what they may do, as the subscriptions API learns it: it does not read the
 * token, it asks the users API on every request. The simulator asks the simulator of the users
 * service, so a permission taken away from a role takes effect on the next request, and the answer
 * of `me` and the one of this API always agree. The users API can also fail to answer.
 *
 * Without `directory` (the tests of the hooks and components of the Panel, feature 007) every
 * token of the tests has every permission: what those tests check is what the screen does with the
 * answer.
 */
export function createAuthorization(directory?: UsersDirectoryMock) {
  let unavailable = false;

  return {
    /** The `sub` of the token the tests give, `Bearer test-token:<sub>`; a 401 otherwise. */
    authenticate(request: Request): string {
      const header = request.headers.get('authorization');
      if (header === null) {
        throw new CatalogError(
          401,
          'unauthenticated',
          'Debe iniciar sesión para usar esta operación.',
        );
      }
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token?.startsWith(TEST_TOKEN_PREFIX)) {
        throw new CatalogError(401, 'invalid_token', 'El token de acceso no es válido.');
      }
      return token.slice(TEST_TOKEN_PREFIX.length);
    },

    /**
     * The permission, which is checked before the request is validated: a 403 arrives before a 422
     * or a 404. Someone the users service does not know, or who is not active, has no permission.
     */
    requirePermission(sub: string, permission: string): void {
      if (unavailable) {
        throw new CatalogError(
          503,
          'authorization_unavailable',
          'No se pudo verificar su permiso por ahora. Inténtelo de nuevo más tarde.',
        );
      }
      if (directory !== undefined && !directory.state.permissionsOf(sub).has(permission)) {
        throw new CatalogError(
          403,
          'permission_denied',
          `No tiene permiso para realizar esta operación. Permiso requerido: ${permission}.`,
        );
      }
    },

    controls: {
      /** From now on the users API does not answer: every request is a 503. */
      unavailable(): void {
        unavailable = true;
      },
      recover(): void {
        unavailable = false;
      },
    },
  };
}

export type Authorization = ReturnType<typeof createAuthorization>;
