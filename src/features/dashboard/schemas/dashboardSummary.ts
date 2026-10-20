import { z } from 'zod';

/** The longest list of recent clinics the service sends (contracts/dashboard-service.md, D1). */
const MAX_RECENT_CLINICS = 10;

/** A count of the platform: an integer of 0 or more, or `null` when its source failed. */
const countSchema = z.number().int().min(0).nullable();

/** One of the clinics registered most recently, as the list of the Panel shows it. */
export const recentClinicSchema = z
  .object({
    // Only the key of its row: it is never shown (FR-035).
    id: z.string().min(1),
    name: z.string().min(1),
    created_at: z.iso.datetime({ offset: true }),
    // Shown by its name, as the service writes it, without translating it by its id.
    status: z.object({ id: z.number().int(), name: z.string().min(1) }),
  })
  .transform((dto) => ({
    id: dto.id,
    name: dto.name,
    createdAt: dto.created_at,
    status: dto.status,
  }));

/**
 * The summary of the platform that the Panel shows (`GET /api/v1/dashboard`). It parses the DTO of
 * the service (snake_case) into the domain model (camelCase), so components never see the DTO
 * (constitution II). The seven fields are required: an answer without one of them is out of
 * contract, and the Panel never shows it in part.
 *
 * `null` is «not available» (its source failed) and never becomes 0 or an empty list, which mean
 * that there is nothing (FR-007, FR-008). The rules of the service (the active and trial clinics
 * fit in the total, the users include the doctors) are not checked: the data is shown as it comes
 * (research D4).
 */
export const dashboardSummarySchema = z
  .object({
    total_clinics: countSchema,
    active_clinics: countSchema,
    trial_clinics: countSchema,
    total_doctors: countSchema,
    total_patients: countSchema,
    total_users: countSchema,
    // Newest first, as the service sorts them; never sorted again here.
    recent_clinics: z.array(recentClinicSchema).max(MAX_RECENT_CLINICS).nullable(),
  })
  .transform((dto) => ({
    totalClinics: dto.total_clinics,
    activeClinics: dto.active_clinics,
    trialClinics: dto.trial_clinics,
    totalDoctors: dto.total_doctors,
    totalPatients: dto.total_patients,
    totalUsers: dto.total_users,
    recentClinics: dto.recent_clinics,
  }));

export type DashboardSummary = z.output<typeof dashboardSummarySchema>;

export type RecentClinic = z.output<typeof recentClinicSchema>;

/** The answer of the service, in snake_case: what the simulator and the factories of the tests build. */
export type DashboardDto = z.input<typeof dashboardSummarySchema>;
