import { uuidOf } from '../../ids';
import { directoryRole, directoryUser, type DirectoryInitial, type DirectoryUser } from './model';

/** The Auth0 account of the operator that the tests use, who is an administrator. */
export const ADMIN_SUB = 'auth0|admin';

/** The id of that operator. */
export const ADMIN_ID = uuidOf(1);

const ALL_ACTIONS = ['read', 'write', 'update', 'delete'];

const permissionsOf = (resource: string): string[] =>
  ALL_ACTIONS.map((action) => `${resource}:${action}`);

/**
 * The platform as the tests find it: the roles of the catalog and one operator, an active
 * administrator with the id `ADMIN_ID`, who can do everything with the users and read the roles.
 */
export function defaultDirectory(): DirectoryInitial {
  return {
    users: [
      directoryUser({
        id: ADMIN_ID,
        auth0Id: ADMIN_SUB,
        email: 'admin@mailysoft.test',
        firstName: 'Admin',
        paternalLastName: 'Sistema',
      }),
    ],
    roles: [
      directoryRole({
        id: 1,
        name: 'Administrator',
        permissions: [
          ...permissionsOf('users'),
          'roles:read',
          ...permissionsOf('subscriptions'),
          ...permissionsOf('tenants'),
        ],
      }),
      directoryRole({ id: 2, name: 'Developer' }),
      directoryRole({ id: 3, name: 'Owner' }),
      directoryRole({ id: 4, name: 'Marketing', permissions: ['tenants:read'] }),
      directoryRole({ id: 5, name: 'Billing', permissions: ['subscriptions:read'] }),
      directoryRole({ id: 6, name: 'Doctor' }),
      directoryRole({ id: 7, name: 'Support' }),
    ],
    associations: [{ userId: ADMIN_ID, roleId: 1 }],
  };
}

/**
 * `count` active users to fill the list: `Usuario Prueba 01` with `seed01@ejemplo.com`, and so on,
 * as the data of the validation guide. Their ids start after the operator, unless said otherwise.
 */
export function makeUsers(count: number, firstId = 2): DirectoryUser[] {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return directoryUser({
      id: uuidOf(firstId + index),
      auth0Id: `auth0|seed-${number}`,
      email: `seed${number}@ejemplo.com`,
      firstName: 'Usuario',
      paternalLastName: `Prueba ${number}`,
    });
  });
}
