import { http, HttpResponse } from 'msw';

import { server } from '../server';
import { USERS_API_BASE_URL } from './usersService';

export interface ClinicModuleDto {
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly sort_order: number;
}

/**
 * The 18 real clinic modules of the current catalog (022, FR-011), with a `sort_order` spaced by 10
 * in that same order. A literal list, not derived from anything the Backoffice no longer keeps
 * (`clinicModuleCatalog.ts` was retired in this same feature, research D4): most integration tests
 * already look up a checkbox by one of these names, so they keep passing once this mock is
 * registered, without rewriting their assertions.
 */
export const DEFAULT_CLINIC_MODULES: readonly ClinicModuleDto[] = [
  { key: 'overview', name: 'Resumen', description: null, sort_order: 10 },
  { key: 'schedule', name: 'Agenda', description: null, sort_order: 20 },
  { key: 'appointments', name: 'Citas', description: null, sort_order: 30 },
  { key: 'patients', name: 'Pacientes', description: null, sort_order: 40 },
  { key: 'prescriptions', name: 'Recetas', description: null, sort_order: 50 },
  { key: 'vital_signs', name: 'Signos vitales', description: null, sort_order: 60 },
  { key: 'patient_diagnoses', name: 'Diagnósticos', description: null, sort_order: 70 },
  { key: 'templates', name: 'Plantillas', description: null, sort_order: 80 },
  { key: 'clinics', name: 'Clínicas', description: null, sort_order: 90 },
  { key: 'consulting_rooms', name: 'Consultorios', description: null, sort_order: 100 },
  { key: 'staff', name: 'Personal', description: null, sort_order: 110 },
  { key: 'finance', name: 'Finanzas', description: null, sort_order: 120 },
  { key: 'billing', name: 'Facturación', description: null, sort_order: 130 },
  { key: 'expenses', name: 'Gastos', description: null, sort_order: 140 },
  { key: 'incomes', name: 'Ingresos', description: null, sort_order: 150 },
  { key: 'services', name: 'Servicios', description: null, sort_order: 160 },
  { key: 'reports', name: 'Reportes', description: null, sort_order: 170 },
  { key: 'reminders', name: 'Recordatorios', description: null, sort_order: 180 },
];

type Behavior =
  | { readonly kind: 'normal' }
  | { readonly kind: 'fail'; readonly status: number; readonly code: string }
  | { readonly kind: 'hang' };

interface RecordedRequest {
  readonly search: string;
}

/**
 * Simulates `GET /api/v1/modules?type_id=2&status_id=1` (021, research D10) at network level, with a
 * configurable catalog and failure behavior, mismo patrón que `createUsersServiceMock`. Not a copy of
 * `modulesCatalog/` (`features/modules`) nor `rolesCatalog/` (`features/roles`): each feature already
 * simulates this same real endpoint on its own in this repository.
 */
export function createClinicModulesCatalogMock(
  initial: readonly ClinicModuleDto[] = DEFAULT_CLINIC_MODULES,
) {
  let modules = [...initial];
  let behavior: Behavior = { kind: 'normal' };
  const requests: RecordedRequest[] = [];

  server.use(
    http.get(`${USERS_API_BASE_URL}/api/v1/modules`, ({ request }) => {
      requests.push({ search: new URL(request.url).search });

      const current = behavior;
      if (current.kind === 'hang') {
        return new Promise<Response>(() => undefined);
      }
      if (current.kind === 'fail') {
        return HttpResponse.json(
          { code: current.code, message: `Error ${current.status}` },
          { status: current.status },
        );
      }
      return HttpResponse.json(
        modules.map((module, index) => ({
          id: index + 1,
          key: module.key,
          name: module.name,
          description: module.description,
          sort_order: module.sort_order,
          created_at: '2026-10-22T00:00:00Z',
          status: { id: 1, name: 'Activo' },
          type: { id: 2, name: 'Clínica' },
          active_permissions_count: 0,
        })),
      );
    }),
  );

  return {
    requests,
    /** Replaces the catalog the mock answers with, from now on. */
    setModules(next: readonly ClinicModuleDto[]): void {
      modules = [...next];
    },
    /** From now on the request answers with an error status. */
    failWith(status: number, code = 'internal_error'): void {
      behavior = { kind: 'fail', status, code };
    },
    /** From now on the request is received but never answered. */
    hang(): void {
      behavior = { kind: 'hang' };
    },
    /** Back to answering normally, with the catalog already set. */
    recover(): void {
      behavior = { kind: 'normal' };
    },
  };
}

export type ClinicModulesCatalogMock = ReturnType<typeof createClinicModulesCatalogMock>;
