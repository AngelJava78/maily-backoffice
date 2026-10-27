import type { z } from 'zod';

import type { OperatorAccess } from '@/features/auth/policy/types';
import type { accessRoleSchema, myAccessSchema } from '@/features/auth/schemas/myAccess';
import type {
  DashboardDto,
  recentClinicSchema,
} from '@/features/dashboard/schemas/dashboardSummary';
import type { HealthResultDto } from '@/features/health/schemas/healthResult';
import type { MonitoredComponentDto } from '@/features/health/schemas/monitoredComponent';
import type { systemModuleSchema } from '@/features/modules/schemas/systemModule';
import type { subscriptionSchema } from '@/features/subscriptions/schemas/subscription';
import { platformUserSchema } from '@/features/users';
import type { roleSchema } from '@/features/users/schemas/role';
import type { userPageSchema } from '@/features/users/schemas/userPage';

import { uuidOf } from './ids';

/** The users service speaks snake_case; these are the types of its answers (schema inputs). */
export type UserDto = z.input<typeof platformUserSchema>;
export type RoleDto = z.input<typeof accessRoleSchema>;
export type MyAccessDto = z.input<typeof myAccessSchema>;
export type RoleRecordDto = z.input<typeof roleSchema>;
export type UserPageDto = z.input<typeof userPageSchema>;
/** The subscriptions API speaks snake_case too; this is the type of a subscription in its answers. */
export type SubscriptionDto = z.input<typeof subscriptionSchema>;
/** The same API answers the summary of the Panel (feature 007); this is one of its recent clinics. */
export type RecentClinicDto = z.input<typeof recentClinicSchema>;
export type { DashboardDto };
/** The users service also answers modules (spec 013 of mailySoft-usuarios); same snake_case shape. */
export type ModuleDto = z.input<typeof systemModuleSchema>;
/** The aggregator of maily-system-api answers the health of the platform (feature 016). */
export type { HealthResultDto };
export type HealthComponentDto = HealthResultDto['components'][number];
export type HealthCheckDto = HealthComponentDto['checks'][number];
/** The same service answers the registry of components; this is one of them. */
export type { MonitoredComponentDto };
/** A permission as that same service returns it, with its module and its action (or both `null`). */
export interface PermissionDto {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly created_at: string;
  readonly status: { readonly id: number; readonly name: string };
  readonly module: {
    readonly id: number;
    readonly key: string;
    readonly name: string;
    readonly type: { readonly id: number; readonly name: string };
  } | null;
  readonly action: { readonly id: number; readonly key: string; readonly name: string } | null;
}

/** A user as the users service returns it: active, with the id `uuidOf(121)` and a maternal last name. */
export function userDto(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: uuidOf(121),
    auth0_id: 'auth0|user1',
    email: 'ana@clinica.com',
    first_name: 'Ana',
    paternal_last_name: 'Pérez',
    maternal_last_name: 'Gómez',
    status: { id: 1, name: 'Activo' },
    created_at: '2026-10-15T14:20:11.032Z',
    updated_at: '2026-10-15T14:20:11.032Z',
    ...overrides,
  };
}

/**
 * An active role with its type and its active permissions; by default Marketing, of type Sistema
 * (feature 006, research D8), with `tenants:read`. A test that needs a role of type Clínica, or
 * that stands for one that must not give access to the Backoffice, overrides `type` explicitly.
 */
export function roleDto(overrides: Partial<RoleDto> = {}): RoleDto {
  return {
    id: 4,
    name: 'Marketing',
    type: { id: 1, name: 'Sistema' },
    permissions: ['tenants:read'],
    ...overrides,
  };
}

/**
 * A role of the catalog as the roles endpoints send it (R1 and U10): active Marketing by default.
 * It is not the role of `me`, which carries permissions instead of a description (`roleDto`).
 */
export function roleRecordDto(overrides: Partial<RoleRecordDto> = {}): RoleRecordDto {
  return {
    id: 4,
    name: 'Marketing',
    description: null,
    created_at: '2026-10-15T05:57:30.521Z',
    status: { id: 1, name: 'Activo' },
    ...overrides,
  };
}

/** A page of the list of users with one user, as the service sends it. */
export function userPageDto(overrides: Partial<UserPageDto> = {}): UserPageDto {
  return { items: [userDto()], total: 1, page: 1, page_size: 10, pages: 1, ...overrides };
}

/** The page asked for out of all the active users: it works out the total and the number of pages. */
export function userPageDtoOf(
  users: readonly UserDto[],
  { page = 1, pageSize = 10 }: { readonly page?: number; readonly pageSize?: number } = {},
): UserPageDto {
  return {
    items: users.slice((page - 1) * pageSize, page * pageSize),
    total: users.length,
    page,
    page_size: pageSize,
    pages: Math.ceil(users.length / pageSize),
  };
}

/** The answer of `GET /api/v1/authorization/me`: a user with one authorized role by default. */
export function myAccessDto(overrides: Partial<MyAccessDto> = {}): MyAccessDto {
  return { user: userDto(), roles: [roleDto()], ...overrides };
}

/**
 * Domain model of a person who may enter, with the Administrator permissions by default: every
 * action on the three sections and the reading of the roles (feature 002).
 */
export function operatorAccess(overrides: Partial<OperatorAccess> = {}): OperatorAccess {
  const permissions = [
    ...['users', 'subscriptions', 'tenants'].flatMap((resource) =>
      ['read', 'write', 'update', 'delete'].map((action) => `${resource}:${action}`),
    ),
    'roles:read',
  ];
  const administrator = {
    id: 1,
    name: 'Administrator',
    type: { id: 1, name: 'Sistema' },
    permissions,
  };
  return {
    user: platformUserSchema.parse(userDto()),
    roles: [administrator],
    authorizedRoles: [administrator],
    permissions: new Set(permissions),
    ...overrides,
  };
}

/**
 * A subscription as the subscriptions API returns it: Profesional, active, without clinics (id 2;
 * the mockup example of contracts/subscriptions-service.md).
 */
export function subscriptionDto(overrides: Partial<SubscriptionDto> = {}): SubscriptionDto {
  return {
    id: 2,
    name: 'Pro',
    description: 'Para clínicas en crecimiento.',
    subscription_type: { id: 1, name: 'Individual' },
    monthly_price: '4500.00',
    annual_price: '45000.00',
    trial_days: 14,
    self_service: true,
    module_keys: [
      'clinical_record_templates',
      'clinical_records',
      'patients',
      'prescriptions',
      'reminders',
      'scheduling',
    ],
    other_features: ['Soporte por correo y WhatsApp', 'Capacitación inicial en línea'],
    consulting_rooms_limit: 2,
    doctors_limit: 3,
    assistants_limit: 2,
    new_patients_per_year_limit: 15000,
    status: { id: 1, name: 'Activa' },
    clinics_count: 0,
    created_at: '2026-10-17T15:00:00Z',
    updated_at: '2026-10-17T15:00:00Z',
    ...overrides,
  };
}

/** A recent clinic as the summary of the Panel sends it: Clínica Santa Aurora, in trial. */
export function recentClinicDto(overrides: Partial<RecentClinicDto> = {}): RecentClinicDto {
  return {
    id: '5457da22-336d-49d8-8876-4d7edb5586ae',
    name: 'Clínica Santa Aurora',
    created_at: '2026-10-15T16:20:00Z',
    status: { id: 2, name: 'En prueba' },
    ...overrides,
  };
}

const ACTIVE_CLINIC = { id: 1, name: 'Activa' };

/**
 * The summary of the Panel as the service sends it in its phase 1 (contracts/dashboard-service.md,
 * D1): 12 clinics (8 active and 3 in trial), 37 doctors, 1,284 patients, 52 users and the five
 * newest clinics, newest first (the two of the same instant, by id).
 */
export function dashboardDto(overrides: Partial<DashboardDto> = {}): DashboardDto {
  return {
    total_clinics: 12,
    active_clinics: 8,
    trial_clinics: 3,
    total_doctors: 37,
    total_patients: 1284,
    total_users: 52,
    recent_clinics: [
      recentClinicDto(),
      recentClinicDto({
        id: '7513bda5-dd0f-48a0-9053-383ac7ec2c92',
        name: 'Consultorio Del Valle',
        created_at: '2026-10-12T09:05:00Z',
      }),
      recentClinicDto({
        id: 'ca8b4382-8b86-4916-b3cb-002680986de3',
        name: 'Centro Médico Horizonte',
        created_at: '2026-10-09T18:40:00Z',
        status: ACTIVE_CLINIC,
      }),
      recentClinicDto({
        id: '41902d77-45cb-451e-9e11-65c60e56ecf8',
        name: 'Dental Sonríe',
        created_at: '2026-10-08T15:00:00Z',
      }),
      recentClinicDto({
        id: 'e042d32c-3886-4777-953c-68db1d969e0e',
        name: 'Clínica San Rafael',
        created_at: '2026-10-08T15:00:00Z',
        status: ACTIVE_CLINIC,
      }),
    ],
    ...overrides,
  };
}

/** A module as the users service returns it: "Agenda y citas" (Clínica, id 2; the mockup example). */
export function moduleDto(overrides: Partial<ModuleDto> = {}): ModuleDto {
  return {
    id: 2,
    key: 'appointments',
    name: 'Agenda y citas',
    description: 'Calendario por doctor y consultorio; citas y confirmaciones.',
    sort_order: 20,
    created_at: '2026-10-22T00:00:00Z',
    status: { id: 1, name: 'Activo' },
    type: { id: 2, name: 'Clínica' },
    active_permissions_count: 4,
    ...overrides,
  };
}

/** A permission as that same service returns it: "appointments:read", linked to its module and action. */
export function permissionDto(overrides: Partial<PermissionDto> = {}): PermissionDto {
  return {
    id: 1,
    name: 'appointments:read',
    description: null,
    created_at: '2026-10-22T00:00:00Z',
    status: { id: 1, name: 'Activo' },
    module: {
      id: 2,
      key: 'appointments',
      name: 'Agenda y citas',
      type: { id: 2, name: 'Clínica' },
    },
    action: { id: 1, key: 'read', name: 'Ver' },
    ...overrides,
  };
}

/** A check of a component as the aggregator sends it: the database, correct, in 12 ms. */
export function healthCheckDto(overrides: Partial<HealthCheckDto> = {}): HealthCheckDto {
  return { name: 'database', status: 'ok', latency_ms: 12, error: null, ...overrides };
}

/**
 * A component as the aggregator sends it (contracts/health-aggregator.md): maily-system-api, up,
 * with its build data, a commit of 40 characters and the check of its database.
 */
export function healthComponentDto(
  overrides: Partial<HealthComponentDto> = {},
): HealthComponentDto {
  return {
    code: 'maily-system-api',
    name: 'MailySoft System API',
    kind: 'service',
    status: 'up',
    latency_ms: 12,
    checked_at: '2026-10-24T16:00:00Z',
    version: '2.1.0',
    commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
    build_date: '2026-10-24T15:30:00Z',
    environment: 'production',
    checks: [healthCheckDto()],
    error: null,
    next_start_at: null,
    ...overrides,
  };
}

/** The result of the aggregator with everything up: the two integrated components, in order. */
export function healthResultDto(overrides: Partial<HealthResultDto> = {}): HealthResultDto {
  return {
    status: 'ok',
    checked_at: '2026-10-24T16:00:00Z',
    registry_available: true,
    components: [
      healthComponentDto(),
      healthComponentDto({
        code: 'database',
        name: 'Base de datos',
        kind: 'database',
        latency_ms: 8,
        version: 'unknown',
        commit: 'unknown',
        build_date: 'unknown',
        environment: 'unknown',
        checks: [],
      }),
    ],
    ...overrides,
  };
}

/**
 * A registered component as the registry publishes it (contracts/monitored-components.md):
 * mailySoft-usuarios, a microservice with the routes of the v1 contract, enabled.
 */
export function monitoredComponentDto(
  overrides: Partial<MonitoredComponentDto> = {},
): MonitoredComponentDto {
  return {
    id: uuidOf(300),
    code: 'mailysoft-usuarios',
    name: 'MailySoft Usuarios',
    kind: 'service',
    base_url: 'http://mailysoft-usuarios:8000',
    live_path: '/health/live',
    ready_path: '/health/ready',
    info_path: '/info',
    enabled: true,
    sort_order: 10,
    created_at: '2026-10-24T17:00:00Z',
    updated_at: '2026-10-24T17:30:00Z',
    ...overrides,
  };
}
