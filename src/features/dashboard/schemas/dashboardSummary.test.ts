import { describe, expect, it } from 'vitest';

import { dashboardSummarySchema } from './dashboardSummary';

/** Each count of the answer and its name in the domain model. */
const COUNTS = [
  ['total_clinics', 'totalClinics'],
  ['active_clinics', 'activeClinics'],
  ['trial_clinics', 'trialClinics'],
  ['total_doctors', 'totalDoctors'],
  ['total_patients', 'totalPatients'],
  ['total_users', 'totalUsers'],
] as const;

/** The newest clinic of phase 1, as the service sends it. */
const santaAurora = {
  id: '5457da22-336d-49d8-8876-4d7edb5586ae',
  name: 'Clínica Santa Aurora',
  created_at: '2026-10-15T16:20:00Z',
  status: { id: 2, name: 'En prueba' },
};

/** The answer of the service in its phase 1 (contracts/dashboard-service.md), newest clinic first. */
const phaseOne = {
  total_clinics: 12,
  active_clinics: 8,
  trial_clinics: 3,
  total_doctors: 37,
  total_patients: 1284,
  total_users: 52,
  recent_clinics: [
    santaAurora,
    {
      id: '7513bda5-dd0f-48a0-9053-383ac7ec2c92',
      name: 'Consultorio Del Valle',
      created_at: '2026-10-12T09:05:00Z',
      status: { id: 2, name: 'En prueba' },
    },
    {
      id: 'ca8b4382-8b86-4916-b3cb-002680986de3',
      name: 'Centro Médico Horizonte',
      created_at: '2026-10-09T18:40:00Z',
      status: { id: 1, name: 'Activa' },
    },
    {
      id: '41902d77-45cb-451e-9e11-65c60e56ecf8',
      name: 'Dental Sonríe',
      created_at: '2026-10-08T15:00:00Z',
      status: { id: 2, name: 'En prueba' },
    },
    {
      id: 'e042d32c-3886-4777-953c-68db1d969e0e',
      name: 'Clínica San Rafael',
      created_at: '2026-10-08T15:00:00Z',
      status: { id: 1, name: 'Activa' },
    },
  ],
};

function without<T extends object>(source: T, key: keyof T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

/** The answer with a single clinic, built from Santa Aurora with these changes. */
function withClinic(clinic: Record<string, unknown>) {
  return { ...phaseOne, recent_clinics: [clinic] };
}

function accepts(dto: unknown): boolean {
  return dashboardSummarySchema.safeParse(dto).success;
}

describe('dashboardSummarySchema', () => {
  it('converts the answer of phase 1 into the camelCase domain model, keeping the order', () => {
    expect(dashboardSummarySchema.parse(phaseOne)).toEqual({
      totalClinics: 12,
      activeClinics: 8,
      trialClinics: 3,
      totalDoctors: 37,
      totalPatients: 1284,
      totalUsers: 52,
      recentClinics: [
        {
          id: '5457da22-336d-49d8-8876-4d7edb5586ae',
          name: 'Clínica Santa Aurora',
          createdAt: '2026-10-15T16:20:00Z',
          status: { id: 2, name: 'En prueba' },
        },
        {
          id: '7513bda5-dd0f-48a0-9053-383ac7ec2c92',
          name: 'Consultorio Del Valle',
          createdAt: '2026-10-12T09:05:00Z',
          status: { id: 2, name: 'En prueba' },
        },
        {
          id: 'ca8b4382-8b86-4916-b3cb-002680986de3',
          name: 'Centro Médico Horizonte',
          createdAt: '2026-10-09T18:40:00Z',
          status: { id: 1, name: 'Activa' },
        },
        {
          id: '41902d77-45cb-451e-9e11-65c60e56ecf8',
          name: 'Dental Sonríe',
          createdAt: '2026-10-08T15:00:00Z',
          status: { id: 2, name: 'En prueba' },
        },
        {
          id: 'e042d32c-3886-4777-953c-68db1d969e0e',
          name: 'Clínica San Rafael',
          createdAt: '2026-10-08T15:00:00Z',
          status: { id: 1, name: 'Activa' },
        },
      ],
    });
  });

  // `null` means that the source of that datum failed, and 0 that it has nothing (FR-007).
  describe.each(COUNTS)('the count %s', (field, domainField) => {
    it('keeps null as null, never as 0, without touching the other values', () => {
      const summary = dashboardSummarySchema.parse({ ...phaseOne, [field]: null });

      expect(summary[domainField]).toBeNull();
      expect(summary).toEqual({
        ...dashboardSummarySchema.parse(phaseOne),
        [domainField]: null,
      });
    });

    it('keeps 0 as 0', () => {
      expect(dashboardSummarySchema.parse({ ...phaseOne, [field]: 0 })[domainField]).toBe(0);
    });

    it.each([-1, 2.5, '12'])('rejects %j: it must be an integer of 0 or more, or null', (value) => {
      expect(accepts({ ...phaseOne, [field]: value })).toBe(false);
    });

    it('is required: an answer without it is out of contract', () => {
      expect(accepts(without(phaseOne, field))).toBe(false);
    });
  });

  describe('the recent clinics', () => {
    it('keeps an empty list as empty and a list that is not available as null (FR-008)', () => {
      expect(
        dashboardSummarySchema.parse({ ...phaseOne, recent_clinics: [] }).recentClinics,
      ).toEqual([]);
      expect(
        dashboardSummarySchema.parse({ ...phaseOne, recent_clinics: null }).recentClinics,
      ).toBeNull();
    });

    it('keeps the order of the service, without sorting the list', () => {
      const reversed = [...phaseOne.recent_clinics].reverse();

      const summary = dashboardSummarySchema.parse({ ...phaseOne, recent_clinics: reversed });

      expect(summary.recentClinics?.map((clinic) => clinic.name)).toEqual(
        reversed.map((clinic) => clinic.name),
      );
    });

    it('accepts up to 10 clinics and rejects 11', () => {
      const clinics = (count: number) =>
        Array.from({ length: count }, (_, index) => ({ ...santaAurora, id: `clinic-${index}` }));

      expect(accepts({ ...phaseOne, recent_clinics: clinics(10) })).toBe(true);
      expect(accepts({ ...phaseOne, recent_clinics: clinics(11) })).toBe(false);
    });

    it('is required: an answer without the list is out of contract', () => {
      expect(accepts(without(phaseOne, 'recent_clinics'))).toBe(false);
    });

    it.each(['id', 'name'] as const)('requires a non-empty %s in each clinic', (field) => {
      expect(accepts(withClinic({ ...santaAurora, [field]: '' }))).toBe(false);
      expect(accepts(withClinic(without(santaAurora, field)))).toBe(false);
    });

    it.each(['2026-10-15T16:20:00Z', '2026-10-15T16:20:00.123Z', '2026-10-15T10:20:00-06:00'])(
      'accepts the date and time of creation %s',
      (createdAt) => {
        const summary = dashboardSummarySchema.parse(
          withClinic({ ...santaAurora, created_at: createdAt }),
        );

        expect(summary.recentClinics?.[0]?.createdAt).toBe(createdAt);
      },
    );

    it.each(['2026-10-15', 'ayer'])('rejects the date of creation %j', (createdAt) => {
      expect(accepts(withClinic({ ...santaAurora, created_at: createdAt }))).toBe(false);
      expect(accepts(withClinic(without(santaAurora, 'created_at')))).toBe(false);
    });

    it('requires a status with an integer id and a non-empty name', () => {
      expect(accepts(withClinic({ ...santaAurora, status: { id: 2.5, name: 'En prueba' } }))).toBe(
        false,
      );
      expect(accepts(withClinic({ ...santaAurora, status: { id: '2', name: 'En prueba' } }))).toBe(
        false,
      );
      expect(accepts(withClinic({ ...santaAurora, status: { id: 2, name: '' } }))).toBe(false);
      expect(accepts(withClinic(without(santaAurora, 'status')))).toBe(false);
    });
  });
});
