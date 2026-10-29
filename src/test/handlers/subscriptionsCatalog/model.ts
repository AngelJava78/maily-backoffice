import { REQUIRED_MODULE_KEY } from '@/features/subscriptions/schemas/clinicModule';

import type { SubscriptionDto } from '../../factories';

/** Ids of the statuses of the API. Statuses added by hand have an id from 5. */
const ACTIVE = 1;
const DELETED = 4;

/** The id of the Individual subscription type (006-add-subscription-type), where the clinics
 * limit rule differs from every other type (007-add-clinics-limit, predicted). */
const INDIVIDUAL_TYPE_ID = 1;

/**
 * The names of the subscription type catalog, kept by the simulator itself (like the status names
 * above), never imported from `es.ts`: that is frontend text, not the "server" this imitates.
 */
const SUBSCRIPTION_TYPE_NAMES = new Map([
  [1, 'Individual'],
  [2, 'Empresarial'],
]);

/** The statuses an operator can set (S5). */
const CHANGEABLE: ReadonlySet<number> = new Set([1, 2, 3]);

const DEFAULT_STATUSES: readonly CatalogStatus[] = [
  { id: 1, name: 'Activa' },
  { id: 2, name: 'Inactiva' },
  { id: 3, name: 'Bloqueada' },
  { id: DELETED, name: 'Eliminada' },
];

/** A subscription as the simulator keeps it. */
export interface CatalogSubscription {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly subscriptionTypeId: number;
  /** 1 if `subscriptionTypeId` is Individual; 1 to 100 otherwise (007, predicted). */
  readonly clinicsLimit: number;
  /** Always with two decimals, as the API keeps it: `4500.00`. */
  readonly monthlyPrice: string;
  /** Always with two decimals, independent of the monthly price. */
  readonly annualPrice: string;
  readonly trialDays: number;
  readonly selfService: boolean;
  /** Always includes `REQUIRED_MODULE_KEY` ("patients"). */
  readonly moduleKeys: readonly string[];
  readonly otherFeatures: readonly string[];
  readonly consultingRoomsLimit: number;
  readonly doctorsLimit: number;
  readonly assistantsLimit: number;
  readonly newPatientsPerYearLimit: number;
  readonly statusId: number;
  /** The clinics that have it, as the clinics API would count them when it is available. */
  readonly clinicsCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A status of the catalog of statuses. */
export interface CatalogStatus {
  readonly id: number;
  readonly name: string;
}

export interface CatalogInitial {
  readonly subscriptions: readonly CatalogSubscription[];
  /** Statuses added by hand, besides the four of the API. */
  readonly statuses?: readonly CatalogStatus[];
}

/** What a creation receives once its body is valid (S3), with the names of the API. */
export interface SubscriptionInput {
  readonly name: string;
  readonly description?: string | null;
  readonly subscription_type_id: number;
  readonly clinics_limit: number;
  readonly monthly_price: string | number;
  readonly annual_price: string | number;
  readonly trial_days?: number;
  readonly self_service?: boolean;
  /** Besides `patients`, which is always included whether or not it is sent. */
  readonly module_keys?: readonly string[];
  readonly other_features?: readonly string[];
  readonly consulting_rooms_limit: number;
  readonly doctors_limit: number;
  readonly assistants_limit: number;
  readonly new_patients_per_year_limit: number;
}

/** What an edition receives once its body is valid (S4): only the data that change. */
export interface SubscriptionChanges {
  readonly name?: string;
  readonly description?: string | null;
  /**
   * Unlike `subscription_type_id` (never accepted here at all), this one is accepted, but only
   * while the subscription being updated is not Individual (007, predicted): `update()` below
   * refuses the whole request if it is present on an Individual subscription, any value included.
   */
  readonly clinics_limit?: number;
  readonly monthly_price?: string | number;
  readonly annual_price?: string | number;
  readonly trial_days?: number;
  readonly self_service?: boolean;
  readonly module_keys?: readonly string[];
  readonly other_features?: readonly string[];
  readonly consulting_rooms_limit?: number;
  readonly doctors_limit?: number;
  readonly assistants_limit?: number;
  readonly new_patients_per_year_limit?: number;
}

export interface CatalogFieldError {
  readonly field: string;
  readonly message: string;
}

/** A refusal of the API: the status, the `code` and its message in Spanish (error catalog). */
export class CatalogError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly CatalogFieldError[] | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: readonly CatalogFieldError[],
  ) {
    super(message);
    this.name = 'CatalogError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** The refusal of a request with data that are not valid, with one error per datum. */
export function validationError(fieldErrors: readonly CatalogFieldError[]): CatalogError {
  return new CatalogError(
    422,
    'validation_error',
    'Hay datos no válidos en la solicitud.',
    fieldErrors,
  );
}

export function notFoundError(id: number | string): CatalogError {
  return new CatalogError(
    404,
    'subscription_not_found',
    `No se encontró la suscripción con el identificador ${id}.`,
  );
}

/** An active subscription without clinics nor description, whose name depends on its id. */
export function catalogSubscription(
  overrides: Partial<CatalogSubscription> = {},
): CatalogSubscription {
  const id = overrides.id ?? 1;
  return {
    id,
    name: `Plan ${id}`,
    description: null,
    subscriptionTypeId: 1,
    clinicsLimit: 1,
    monthlyPrice: '100.00',
    annualPrice: '1000.00',
    trialDays: 0,
    selfService: false,
    moduleKeys: [REQUIRED_MODULE_KEY],
    otherFeatures: [],
    consultingRoomsLimit: 1,
    doctorsLimit: 1,
    assistantsLimit: 0,
    newPatientsPerYearLimit: 0,
    statusId: ACTIVE,
    clinicsCount: 0,
    createdAt: '2026-10-17T15:00:00.000Z',
    updatedAt: '2026-10-17T15:00:00.000Z',
    ...overrides,
  };
}

/** The price as the API keeps it, with two decimals: `4500` is `4500.00`. */
function keepPrice(price: string | number): string {
  const [pesos = '0', decimals = ''] = String(price).trim().split('.');
  return `${Number(pesos)}.${decimals.padEnd(2, '0').slice(0, 2)}`;
}

function orNull(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * The 18 real clinic modules of the current catalog (022, FR-011), its own literal list, not
 * imported from `subscriptionModulesCatalog.ts` (research D6): they simulate two independent
 * services, and this one never calls the users API to validate `module_keys`.
 */
const KNOWN_MODULE_KEYS: ReadonlySet<string> = new Set([
  'overview',
  'schedule',
  'appointments',
  'patients',
  'prescriptions',
  'vital_signs',
  'patient_diagnoses',
  'templates',
  'clinics',
  'consulting_rooms',
  'staff',
  'finance',
  'billing',
  'expenses',
  'incomes',
  'services',
  'reports',
  'reminders',
]);

/**
 * `subscription_type_id` is discovered at the `INSERT`, by the foreign key, not with an earlier
 * read (same order as `normalizeModuleKeys` below, and as the real API, research D1/D5 of the
 * plan): a positive integer that is not `1` nor `2` today refuses, it is never silently accepted.
 */
function requireKnownSubscriptionType(id: number): void {
  if (!SUBSCRIPTION_TYPE_NAMES.has(id)) {
    throw new CatalogError(
      422,
      'subscription_type_not_found',
      `No se encontró el tipo de suscripción con el identificador ${id}.`,
    );
  }
}

/**
 * The clinics limit's business range depends on the subscription type (007-add-clinics-limit of
 * `maily-system-api`, predicted — not implemented there yet, research D4 of 019): exactly 1 for
 * Individual; 1 to 100 otherwise. Checked after the type itself is known to exist.
 */
function requireClinicsLimitForType(subscriptionTypeId: number, clinicsLimit: number): void {
  if (subscriptionTypeId === INDIVIDUAL_TYPE_ID) {
    if (clinicsLimit !== 1) {
      throw validationError([
        {
          field: 'clinics_limit',
          message: 'El límite de clínicas de una suscripción Individual debe ser exactamente 1.',
        },
      ]);
    }
    return;
  }
  if (clinicsLimit < 1 || clinicsLimit > 100) {
    throw validationError([
      {
        field: 'clinics_limit',
        message: 'El límite de clínicas debe ser un número entero de 1 a 100.',
      },
    ]);
  }
}

/**
 * The module keys a creation or an edition sends, always including `patients`, validated the way
 * the real API does (research D9 of the Backoffice's plan; `maily-system-api/src/clinic_modules.py`):
 * every key must be a clinic module the users API recognises (here, its own literal catalog of 18).
 * No dependency between modules is validated any more (022, FR-008, FR-011).
 */
function normalizeModuleKeys(keys: readonly string[] | undefined): string[] {
  const requested = new Set([...(keys ?? []), REQUIRED_MODULE_KEY]);
  for (const key of requested) {
    if (!KNOWN_MODULE_KEYS.has(key)) {
      throw new CatalogError(
        422,
        'subscription_module_not_found',
        `La API de usuarios no reconoce el módulo «${key}» como un módulo de clínica vigente.`,
      );
    }
  }
  return [...requested].sort();
}

/**
 * The data of the subscriptions API and its rules (contracts/subscriptions-service.md), in memory
 * and without network: the subscriptions with their status, the catalog of statuses and the clinics
 * of each one, which the clinics API may fail to count. The handlers of the simulator are a thin
 * layer of HTTP over these operations. The operations that apply a rule raise a `CatalogError`;
 * the queries and the helpers to prepare data never do.
 */
export function createCatalogModel(initial: CatalogInitial) {
  let subscriptions: CatalogSubscription[] = [...initial.subscriptions];
  const statuses = new Map(
    [...DEFAULT_STATUSES, ...(initial.statuses ?? [])].map((status) => [status.id, status.name]),
  );
  let clinicsAvailable = true;
  // A logical clock: dates move forward one second per change and never depend on the real time.
  let tick = 0;
  const now = (): string => new Date(Date.UTC(2026, 9, 20, 12, 0, tick++)).toISOString();

  const isVigente = (subscription: CatalogSubscription): boolean =>
    subscription.statusId !== DELETED;

  function find(id: number): CatalogSubscription | undefined {
    return subscriptions.find((subscription) => subscription.id === id && isVigente(subscription));
  }

  function get(id: number): CatalogSubscription {
    const subscription = find(id);
    if (subscription === undefined) {
      throw notFoundError(id);
    }
    return subscription;
  }

  /** Any subscription with this id, deleted or not; only for the helpers of the tests. */
  function anyWithId(id: number): CatalogSubscription {
    const subscription = subscriptions.find((current) => current.id === id);
    if (subscription === undefined) {
      throw new Error(`There is no subscription with the id ${id}`);
    }
    return subscription;
  }

  function replace(subscription: CatalogSubscription): CatalogSubscription {
    subscriptions = subscriptions.map((current) =>
      current.id === subscription.id ? subscription : current,
    );
    return subscription;
  }

  /** Unique without telling the upper case apart, among the ones that are not deleted (`lower(name)`). */
  function requireFreeName(name: string, ownId?: number): void {
    const taken = subscriptions.some(
      (subscription) =>
        isVigente(subscription) &&
        subscription.id !== ownId &&
        subscription.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
      throw new CatalogError(
        409,
        'subscription_name_already_exists',
        `Ya existe una suscripción con el nombre «${name}».`,
      );
    }
  }

  function applyChanges(
    subscription: CatalogSubscription,
    changes: SubscriptionChanges,
  ): CatalogSubscription {
    return {
      ...subscription,
      ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
      ...(changes.description === undefined ? {} : { description: orNull(changes.description) }),
      ...(changes.monthly_price === undefined
        ? {}
        : { monthlyPrice: keepPrice(changes.monthly_price) }),
      ...(changes.annual_price === undefined
        ? {}
        : { annualPrice: keepPrice(changes.annual_price) }),
      ...(changes.trial_days === undefined ? {} : { trialDays: changes.trial_days }),
      ...(changes.self_service === undefined ? {} : { selfService: changes.self_service }),
      ...(changes.clinics_limit === undefined ? {} : { clinicsLimit: changes.clinics_limit }),
      ...(changes.module_keys === undefined
        ? {}
        : { moduleKeys: normalizeModuleKeys(changes.module_keys) }),
      ...(changes.other_features === undefined
        ? {}
        : { otherFeatures: changes.other_features.map((feature) => feature.trim()) }),
      ...(changes.consulting_rooms_limit === undefined
        ? {}
        : { consultingRoomsLimit: changes.consulting_rooms_limit }),
      ...(changes.doctors_limit === undefined ? {} : { doctorsLimit: changes.doctors_limit }),
      ...(changes.assistants_limit === undefined
        ? {}
        : { assistantsLimit: changes.assistants_limit }),
      ...(changes.new_patients_per_year_limit === undefined
        ? {}
        : { newPatientsPerYearLimit: changes.new_patients_per_year_limit }),
      updatedAt: now(),
    };
  }

  const statusName = (statusId: number): string => statuses.get(statusId) ?? 'Desconocido';

  function clinicsCountOf(id: number): number | null {
    return clinicsAvailable ? (find(id)?.clinicsCount ?? null) : null;
  }

  return {
    // --- Queries ---
    /** What S1 returns: what is not deleted, by creation date and, on a tie, by id. */
    list(): readonly CatalogSubscription[] {
      return subscriptions
        .filter(isVigente)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    },
    find,
    statusName,
    clinicsCountOf,

    /** A subscription as the API sends it; the clinics are `null` while they are not available. */
    toDto(subscription: CatalogSubscription): SubscriptionDto {
      return {
        id: subscription.id,
        name: subscription.name,
        description: subscription.description,
        subscription_type: {
          id: subscription.subscriptionTypeId,
          name: SUBSCRIPTION_TYPE_NAMES.get(subscription.subscriptionTypeId) ?? 'Desconocido',
        },
        clinics_limit: subscription.clinicsLimit,
        monthly_price: subscription.monthlyPrice,
        annual_price: subscription.annualPrice,
        trial_days: subscription.trialDays,
        self_service: subscription.selfService,
        module_keys: [...subscription.moduleKeys],
        other_features: [...subscription.otherFeatures],
        consulting_rooms_limit: subscription.consultingRoomsLimit,
        doctors_limit: subscription.doctorsLimit,
        assistants_limit: subscription.assistantsLimit,
        new_patients_per_year_limit: subscription.newPatientsPerYearLimit,
        status: { id: subscription.statusId, name: statusName(subscription.statusId) },
        clinics_count: clinicsAvailable ? subscription.clinicsCount : null,
        created_at: subscription.createdAt,
        updated_at: subscription.updatedAt,
      };
    },

    // --- Operations, with the rules of the API ---
    create(input: SubscriptionInput): CatalogSubscription {
      const name = input.name.trim();
      requireFreeName(name);
      // Modules and the subscription type are validated before anything is created, same order as
      // the real API (create vs. update): an invalid request changes nothing.
      const moduleKeys = normalizeModuleKeys(input.module_keys);
      requireKnownSubscriptionType(input.subscription_type_id);
      requireClinicsLimitForType(input.subscription_type_id, input.clinics_limit);
      const at = now();
      const created: CatalogSubscription = {
        id: subscriptions.reduce((highest, current) => Math.max(highest, current.id), 0) + 1,
        name,
        description: orNull(input.description),
        subscriptionTypeId: input.subscription_type_id,
        clinicsLimit: input.clinics_limit,
        monthlyPrice: keepPrice(input.monthly_price),
        annualPrice: keepPrice(input.annual_price),
        trialDays: input.trial_days ?? 0,
        selfService: input.self_service ?? false,
        moduleKeys,
        otherFeatures: (input.other_features ?? []).map((feature) => feature.trim()),
        consultingRoomsLimit: input.consulting_rooms_limit,
        doctorsLimit: input.doctors_limit,
        assistantsLimit: input.assistants_limit,
        newPatientsPerYearLimit: input.new_patients_per_year_limit,
        statusId: ACTIVE,
        clinicsCount: 0,
        createdAt: at,
        updatedAt: at,
      };
      subscriptions = [...subscriptions, created];
      return created;
    },

    update(id: number, changes: SubscriptionChanges): CatalogSubscription {
      const subscription = get(id);
      if (changes.name !== undefined) {
        requireFreeName(changes.name.trim(), id);
      }
      if (changes.clinics_limit !== undefined) {
        // Unlike create (where Individual must be exactly 1), update forbids the field outright on
        // an Individual subscription, any value included (007, predicted; same treatment as
        // subscription_type_id's own immutability, research D4 of 019).
        if (subscription.subscriptionTypeId === INDIVIDUAL_TYPE_ID) {
          throw validationError([
            {
              field: 'clinics_limit',
              message: 'El límite de clínicas no se puede modificar en una suscripción Individual.',
            },
          ]);
        }
        if (changes.clinics_limit < 1 || changes.clinics_limit > 100) {
          throw validationError([
            {
              field: 'clinics_limit',
              message: 'El límite de clínicas debe ser un número entero de 1 a 100.',
            },
          ]);
        }
      }
      return replace(applyChanges(subscription, changes));
    },

    changeStatus(id: number, statusId: number): CatalogSubscription {
      if (!CHANGEABLE.has(statusId)) {
        throw validationError([
          {
            field: 'status_id',
            message: 'El estatus debe ser uno de los que admite esta operación (1, 2 o 3).',
          },
        ]);
      }
      const subscription = get(id);
      if (subscription.statusId === statusId) {
        throw new CatalogError(
          409,
          'subscription_status_unchanged',
          `La suscripción con el identificador ${id} ya tiene el estatus ${statusName(statusId)}.`,
        );
      }
      return replace({ ...subscription, statusId, updatedAt: now() });
    },

    /** The clinics are checked last, once the subscription is known to exist (S6). */
    remove(id: number): void {
      const subscription = get(id);
      if (!clinicsAvailable) {
        throw new CatalogError(
          503,
          'clinics_check_unavailable',
          `No se pudo comprobar si la suscripción con el identificador ${id} tiene clínicas asignadas. No se eliminó; inténtelo de nuevo más tarde.`,
        );
      }
      if (subscription.clinicsCount > 0) {
        throw new CatalogError(
          409,
          'subscription_has_clinics',
          `No se puede eliminar la suscripción con el identificador ${id} porque tiene clínicas asignadas.`,
        );
      }
      replace({ ...subscription, statusId: DELETED, updatedAt: now() });
    },

    // --- Helpers to prepare data and to act as another person: they apply no rule ---
    addSubscription(subscription: CatalogSubscription): void {
      subscriptions = [...subscriptions, subscription];
    },
    addStatus(id: number, name: string): void {
      statuses.set(id, name);
    },
    setClinics(id: number, count: number): void {
      replace({ ...anyWithId(id), clinicsCount: count });
    },
    setStatus(id: number, statusId: number): void {
      replace({ ...anyWithId(id), statusId, updatedAt: now() });
    },
    edit(id: number, changes: SubscriptionChanges): void {
      replace(applyChanges(anyWithId(id), changes));
    },
    markDeleted(id: number): void {
      replace({ ...anyWithId(id), statusId: DELETED, updatedAt: now() });
    },
    /** Whether the clinics API answers: without it the counts are `null` and nothing is deleted. */
    setClinicsAvailable(available: boolean): void {
      clinicsAvailable = available;
    },
  };
}

export type CatalogModel = ReturnType<typeof createCatalogModel>;
