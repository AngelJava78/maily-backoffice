/**
 * The nine clinic modules a subscription plan can include (FR-007), fixed content of this
 * backoffice and not a catalog the operator administers here (research D3): the subscriptions API
 * already validates `module_keys` against the users API's module catalog and against these same
 * four dependencies (`maily-system-api/src/clinic_modules.py`).
 */
export const CLINIC_MODULE_ORDER = [
  'patients',
  'scheduling',
  'reminders',
  'clinical_records',
  'clinical_record_templates',
  'prescriptions',
  'finance',
  'reports',
  'billing',
] as const;

export type ClinicModuleKey = (typeof CLINIC_MODULE_ORDER)[number];

/** Every plan includes it; its checkbox is always checked and disabled. */
export const REQUIRED_MODULE_KEY: ClinicModuleKey = 'patients';

/** Dependent module key -> the prerequisite it needs to be included (FR-007, FR-009). */
export const MODULE_PREREQUISITE: Partial<Record<ClinicModuleKey, ClinicModuleKey>> = {
  reminders: 'scheduling',
  clinical_record_templates: 'clinical_records',
  prescriptions: 'clinical_records',
  billing: 'finance',
};
