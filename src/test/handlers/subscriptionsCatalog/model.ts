import type { SubscriptionDto } from '../../factories';

/** Ids of the statuses of the API. Statuses added by hand have an id from 5. */
const ACTIVE = 1;
const DELETED = 4;

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
  /** Always with two decimals, as the API keeps it: `4500.00`. */
  readonly monthlyPrice: string;
  readonly features: readonly string[];
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
  readonly monthly_price: string | number;
  readonly features?: readonly string[];
}

/** What an edition receives once its body is valid (S4): only the data that change. */
export interface SubscriptionChanges {
  readonly name?: string;
  readonly description?: string | null;
  readonly monthly_price?: string | number;
  readonly features?: readonly string[];
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
    monthlyPrice: '100.00',
    features: [],
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
      ...(changes.features === undefined
        ? {}
        : { features: changes.features.map((feature) => feature.trim()) }),
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
        monthly_price: subscription.monthlyPrice,
        features: [...subscription.features],
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
      const at = now();
      const created: CatalogSubscription = {
        id: subscriptions.reduce((highest, current) => Math.max(highest, current.id), 0) + 1,
        name,
        description: orNull(input.description),
        monthlyPrice: keepPrice(input.monthly_price),
        features: (input.features ?? []).map((feature) => feature.trim()),
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
