import { z } from 'zod';

/**
 * A clinic module as `GET /api/v1/modules?type_id=2&status_id=1` gives it (021, FR-001 to FR-004),
 * converted from its DTO (constitution II). A private copy for this feature, not the lean schema of
 * `features/roles` (no `description`) nor the full one of `features/modules` (fields this feature
 * never uses): a feature does not import another feature's internals (constitution I).
 */
export const clinicModuleSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable(),
    sort_order: z.number().int(),
  })
  .transform((dto) => ({
    key: dto.key,
    name: dto.name,
    description: dto.description,
    sortOrder: dto.sort_order,
  }));

export type ClinicModule = z.output<typeof clinicModuleSchema>;

export const clinicModulesSchema = z.array(clinicModuleSchema);

/** The only key with special treatment (021, Clarifications): always marked, never removable. */
export const REQUIRED_MODULE_KEY = 'patients';
