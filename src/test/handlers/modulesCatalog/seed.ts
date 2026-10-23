import {
  MODULE_ACTION_ID,
  MODULE_TYPE,
  type ModuleActionKey,
} from '@/features/modules/schemas/moduleActionCatalog';

import {
  catalogModule,
  catalogPermission,
  type CatalogInitial,
  type CatalogModule,
  type CatalogPermission,
} from './model';

const CREATED_AT = '2026-10-22T00:00:00Z';

interface SeedModule {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly typeId: number;
  readonly sortOrder: number;
  readonly actions: readonly ModuleActionKey[];
}

/** The 23 real modules of pages 11 to 14 of the mockup, each with its exact actions. */
const SEED_MODULES: readonly SeedModule[] = [
  // Sistema, pantallas del Backoffice (8 módulos).
  {
    key: 'users',
    name: 'Usuarios',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 10,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'subscriptions',
    name: 'Suscripciones',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 20,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'tenants',
    name: 'Clínicas',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 30,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'dashboard',
    name: 'Panel',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 40,
    actions: ['read'],
  },
  {
    key: 'token',
    name: 'Token',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 50,
    actions: ['read'],
  },
  {
    key: 'roles',
    name: 'Roles',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 60,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'permissions',
    name: 'Permisos',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 70,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'modules',
    name: 'Módulos',
    description: '',
    typeId: MODULE_TYPE.SYSTEM,
    sortOrder: 80,
    actions: ['read', 'write', 'update', 'delete'],
  },

  // Clínica, aplicación para clínicas (15 módulos).
  {
    key: 'patients',
    name: 'Pacientes',
    description: 'Directorio de pacientes y sus datos de contacto.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 10,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'appointments',
    name: 'Agenda y citas',
    description: 'Calendario por doctor y consultorio; citas y confirmaciones.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 20,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'schedule',
    name: 'Horarios',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 30,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'reminders',
    name: 'Recordatorios',
    description: 'Avisos de cita por WhatsApp, SMS o correo.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 40,
    actions: ['read', 'update'],
  },
  {
    key: 'medical_records',
    name: 'Expediente clínico',
    description: 'Historia clínica, notas de consulta y archivos.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 50,
    actions: ['read', 'write', 'update'],
  },
  {
    key: 'record_templates',
    name: 'Plantillas de expediente',
    description: 'Plantillas de preguntas que el doctor usa al abrir el expediente de un paciente.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 60,
    actions: ['read'],
  },
  {
    key: 'medical_scores',
    name: 'Escalas médicas',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 70,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'prescriptions',
    name: 'Recetas',
    description: 'Recetas en PDF con los datos del doctor.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 80,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'staff',
    name: 'Personal',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 90,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'teams',
    name: 'Equipos',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 100,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'departments',
    name: 'Departamentos',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 110,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'services',
    name: 'Servicios',
    description: '',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 120,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'finance',
    name: 'Finanzas',
    description: 'Cobros, caja y gastos de la clínica.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 130,
    actions: ['read', 'write', 'update', 'delete'],
  },
  {
    key: 'reports',
    name: 'Reportes',
    description: 'Indicadores de citas, ingresos y pacientes.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 140,
    actions: ['read'],
  },
  {
    key: 'invoicing',
    name: 'Facturación',
    description: 'Facturas CFDI para los pacientes.',
    typeId: MODULE_TYPE.CLINIC,
    sortOrder: 150,
    actions: ['read', 'write', 'update'],
  },
];

/** The default catalog: the 23 real modules of the mockup, each with its exact actions. */
export function defaultCatalog(): CatalogInitial {
  const modules: CatalogModule[] = [];
  const permissions: CatalogPermission[] = [];
  let moduleId = 1;
  let permissionId = 1;

  for (const seed of SEED_MODULES) {
    const module = catalogModule({
      id: moduleId,
      key: seed.key,
      name: seed.name,
      description: seed.description === '' ? null : seed.description,
      sortOrder: seed.sortOrder,
      typeId: seed.typeId,
      createdAt: CREATED_AT,
    });
    modules.push(module);
    moduleId += 1;

    for (const action of seed.actions) {
      permissions.push(
        catalogPermission({
          id: permissionId,
          name: `${seed.key}:${action}`,
          moduleId: module.id,
          actionId: MODULE_ACTION_ID[action],
          createdAt: CREATED_AT,
        }),
      );
      permissionId += 1;
    }
  }

  return { modules, permissions };
}
