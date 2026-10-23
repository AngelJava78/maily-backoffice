import { directoryRole, directoryUser, type DirectoryInitial } from '../usersDirectory/model';
import { uuidOf } from '../../ids';
import type { ModuleRecord, PermissionRecord } from './model';

const SYSTEM_TYPE = 1;
const CLINIC_TYPE = 2;

const ADMIN_SUB = 'auth0|roles-admin';
const ADMIN_ID = uuidOf(1);

const ALL_ACTIONS = ['read', 'write', 'update', 'delete'];
const permissionsOf = (resource: string): string[] =>
  ALL_ACTIONS.map((action) => `${resource}:${action}`);

const SYSTEM_MODULES: readonly ModuleRecord[] = [
  { id: 1, key: 'users', name: 'Usuarios', typeId: SYSTEM_TYPE, sortOrder: 10, statusId: 1 },
  { id: 2, key: 'roles', name: 'Roles', typeId: SYSTEM_TYPE, sortOrder: 20, statusId: 1 },
  { id: 3, key: 'permissions', name: 'Permisos', typeId: SYSTEM_TYPE, sortOrder: 30, statusId: 1 },
  { id: 4, key: 'modules', name: 'Módulos', typeId: SYSTEM_TYPE, sortOrder: 40, statusId: 1 },
];

function withIds(names: readonly string[], firstId: number): PermissionRecord[] {
  return names.map((name, index) => ({ id: firstId + index, name }));
}

const SYSTEM_PERMISSIONS: readonly PermissionRecord[] = withIds(
  ['users', 'roles', 'permissions', 'modules'].flatMap(permissionsOf),
  1,
);

/**
 * The platform as `create_database.sql` seeds it (contracts/roles-service.md), verified against
 * the real backend on 2026-10-23: 9 roles (5 Sistema, 4 Clínica) and only the 4 Sistema modules —
 * no Clínica module exists yet in the real environment, so a Clínica role's matrix is empty. An
 * operator (`ADMIN_SUB`) has every Sistema permission, mirroring `bootstrap_admin.sql`.
 */
export function rolesCatalogScenario(): {
  directory: DirectoryInitial;
  modules: readonly ModuleRecord[];
  permissions: readonly PermissionRecord[];
} {
  return {
    directory: {
      users: [directoryUser({ id: ADMIN_ID, auth0Id: ADMIN_SUB, email: 'admin@mailysoft.test' })],
      roles: [
        directoryRole({
          id: 1,
          name: 'Administrator',
          typeId: SYSTEM_TYPE,
          permissions: SYSTEM_PERMISSIONS.map((permission) => permission.name),
        }),
        directoryRole({ id: 2, name: 'Developer', typeId: SYSTEM_TYPE }),
        directoryRole({ id: 3, name: 'Support', typeId: SYSTEM_TYPE }),
        directoryRole({ id: 4, name: 'Marketing', typeId: SYSTEM_TYPE }),
        directoryRole({ id: 5, name: 'Billing', typeId: SYSTEM_TYPE }),
        directoryRole({ id: 6, name: 'Owner', typeId: CLINIC_TYPE }),
        directoryRole({ id: 7, name: 'Doctor', typeId: CLINIC_TYPE }),
        directoryRole({ id: 8, name: 'Nurse', typeId: CLINIC_TYPE }),
        directoryRole({ id: 9, name: 'Receptionist', typeId: CLINIC_TYPE }),
      ],
      associations: [{ userId: ADMIN_ID, roleId: 1 }],
    },
    modules: SYSTEM_MODULES,
    permissions: SYSTEM_PERMISSIONS,
  };
}

/**
 * The same base, plus three unevenly-featured Clínica modules (mockup, páginas 15-18): Pacientes
 * and Agenda con las cuatro acciones, Recordatorios solo con Ver y Modificar — para ejercitar a
 * fondo la tabla de permisos sin depender de que el entorno real ya tenga módulos de Clínica.
 */
export function richClinicModulesScenario(): ReturnType<typeof rolesCatalogScenario> {
  const base = rolesCatalogScenario();
  const clinicModules: ModuleRecord[] = [
    { id: 5, key: 'patients', name: 'Pacientes', typeId: CLINIC_TYPE, sortOrder: 50, statusId: 1 },
    {
      id: 6,
      key: 'appointments',
      name: 'Agenda y citas',
      typeId: CLINIC_TYPE,
      sortOrder: 60,
      statusId: 1,
    },
    {
      id: 7,
      key: 'reminders',
      name: 'Recordatorios',
      typeId: CLINIC_TYPE,
      sortOrder: 70,
      statusId: 1,
    },
  ];
  const clinicPermissions: PermissionRecord[] = [
    ...withIds(permissionsOf('patients'), 17),
    ...withIds(permissionsOf('appointments'), 21),
    ...withIds(['reminders:read', 'reminders:update'], 25),
  ];
  return {
    directory: base.directory,
    modules: [...base.modules, ...clinicModules],
    permissions: [...base.permissions, ...clinicPermissions],
  };
}

export { ADMIN_ID, ADMIN_SUB };
