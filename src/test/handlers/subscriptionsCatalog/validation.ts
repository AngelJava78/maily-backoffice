import type { PathParams } from 'msw';

import {
  validationError,
  type CatalogFieldError,
  type SubscriptionChanges,
  type SubscriptionInput,
} from './model';

/** A price as text: from 0 to 99,999,999.99, with up to two decimals. */
const PRICE_TEXT = /^[0-9]{1,8}(\.[0-9]{1,2})?$/;

const WRITABLE_FIELDS: ReadonlySet<string> = new Set([
  'name',
  'description',
  'monthly_price',
  'annual_price',
  'trial_days',
  'self_service',
  'module_keys',
  'other_features',
  'consulting_rooms_limit',
  'doctors_limit',
  'assistants_limit',
  'new_patients_per_year_limit',
]);

/** The messages of the error catalog of the API (`errors[]` of a `validation_error`). */
const MESSAGES = {
  body: 'El cuerpo de la solicitud no es válido.',
  emptyUpdate: 'Hay que enviar al menos un dato para modificar.',
  notAllowed: (field: string) => `El campo «${field}» no está permitido.`,
  nameRequired: 'El nombre de la suscripción es obligatorio.',
  nameTooLong: 'El nombre de la suscripción no puede tener más de 100 caracteres.',
  nameNotText: 'El nombre de la suscripción debe ser un texto.',
  descriptionTooLong: 'La descripción no puede tener más de 500 caracteres.',
  descriptionNotText: 'La descripción debe ser un texto.',
  priceRequired: 'El precio mensual es obligatorio.',
  priceInvalid:
    'El precio mensual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
  annualPriceRequired: 'El precio anual es obligatorio.',
  annualPriceInvalid:
    'El precio anual debe ser un importe de 0 a 99 999 999,99 con hasta dos decimales.',
  trialDaysInvalid: 'Los días de prueba deben ser un número entero de 0 a 3650.',
  selfServiceInvalid: 'El autoconsumo debe ser verdadero o falso.',
  moduleKeysNotList: 'Las claves de módulos deben ser una lista de textos.',
  otherFeaturesNotList: 'Otras funcionalidades debe ser una lista de textos.',
  otherFeaturesTooMany: 'Otras funcionalidades no puede tener más de 20 elementos.',
  otherFeatureLength: 'Cada elemento de otras funcionalidades debe tener de 1 a 150 caracteres.',
  limitRequired: (field: string) => `El campo «${field}» es obligatorio.`,
  limitInvalid: (field: string) =>
    `El campo «${field}» debe ser un número entero de 0 a 1 000 000.`,
  statusRequired: 'El estatus es obligatorio y debe ser un número entero.',
  idInvalid: 'El identificador de la suscripción debe ser un número entero positivo.',
  subscriptionTypeRequired:
    'El tipo de suscripción es obligatorio y debe ser un número entero positivo.',
  subscriptionTypeImmutable: 'El tipo de suscripción no puede modificarse una vez creada.',
} as const;

type JsonObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The body, which must be a JSON object. */
function objectBody(body: unknown): JsonObject {
  if (!isObject(body)) {
    throw validationError([{ field: 'body', message: MESSAGES.body }]);
  }
  return body;
}

/** One error for each field that the operation does not admit (`id`, `status`, dates...). */
function notAllowed(body: JsonObject, allowed: ReadonlySet<string>): CatalogFieldError[] {
  return Object.keys(body)
    .filter((field) => !allowed.has(field))
    .map((field) => ({ field, message: MESSAGES.notAllowed(field) }));
}

function nameError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return MESSAGES.nameRequired;
  }
  if (typeof value !== 'string') {
    return MESSAGES.nameNotText;
  }
  const length = value.trim().length;
  if (length === 0) {
    return MESSAGES.nameRequired;
  }
  return length > 100 ? MESSAGES.nameTooLong : null;
}

function descriptionError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return MESSAGES.descriptionNotText;
  }
  return value.trim().length > 500 ? MESSAGES.descriptionTooLong : null;
}

function priceError(required: string, invalid: string) {
  return (value: unknown): string | null => {
    if (value === undefined || value === null) {
      return required;
    }
    if (typeof value === 'number') {
      return value >= 0 && PRICE_TEXT.test(String(value)) ? null : invalid;
    }
    return typeof value === 'string' && PRICE_TEXT.test(value.trim()) ? null : invalid;
  };
}

/** `trial_days` and `self_service` are optional (the model defaults them): only checked if sent. */
function trialDaysError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3650
    ? null
    : MESSAGES.trialDaysInvalid;
}

function selfServiceError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'boolean' ? null : MESSAGES.selfServiceInvalid;
}

/**
 * Only the shape of `module_keys` (a list of texts): whether each key is a known clinic module and
 * whether its prerequisite is included is a business rule the model checks (`normalizeModuleKeys`),
 * because it needs the fixed catalog, not just the JSON body.
 */
function moduleKeysError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? null
    : MESSAGES.moduleKeysNotList;
}

function otherFeaturesError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return MESSAGES.otherFeaturesNotList;
  }
  if (value.length > 20) {
    return MESSAGES.otherFeaturesTooMany;
  }
  const valid = value.every((item: string) => {
    const length = item.trim().length;
    return length >= 1 && length <= 150;
  });
  return valid ? null : MESSAGES.otherFeatureLength;
}

/** Obligatory and strict on create (contracts/subscriptions-service.md); never checked here on
 * update, because that operation does not declare the field at all (see `validateUpdate`). */
function subscriptionTypeIdError(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? null
    : MESSAGES.subscriptionTypeRequired;
}

function limitError(field: string) {
  return (value: unknown): string | null => {
    if (value === undefined || value === null) {
      return MESSAGES.limitRequired(field);
    }
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000
      ? null
      : MESSAGES.limitInvalid(field);
  };
}

const CHECKS: readonly (readonly [string, (value: unknown) => string | null])[] = [
  ['name', nameError],
  ['description', descriptionError],
  ['monthly_price', priceError(MESSAGES.priceRequired, MESSAGES.priceInvalid)],
  ['annual_price', priceError(MESSAGES.annualPriceRequired, MESSAGES.annualPriceInvalid)],
  ['trial_days', trialDaysError],
  ['self_service', selfServiceError],
  ['module_keys', moduleKeysError],
  ['other_features', otherFeaturesError],
  ['consulting_rooms_limit', limitError('consulting_rooms_limit')],
  ['doctors_limit', limitError('doctors_limit')],
  ['assistants_limit', limitError('assistants_limit')],
  ['new_patients_per_year_limit', limitError('new_patients_per_year_limit')],
];

/**
 * The errors of the writable fields. On an update (`onlyPresent: true`), only what the body
 * carries is checked. On a creation (`onlyPresent: false`), every field is checked even if it is
 * absent: each checker above already knows whether its own field is required (`name`, the prices,
 * the four limits) or optional with a default the model applies (`trial_days`, `self_service`,
 * `module_keys`, `other_features`), so there is no separate "required on create" list to keep in
 * sync.
 */
function fieldErrors(body: JsonObject, { onlyPresent }: { readonly onlyPresent: boolean }) {
  return CHECKS.flatMap(([field, check]) => {
    if (onlyPresent && !(field in body)) {
      return [];
    }
    const message = check(body[field]);
    return message === null ? [] : [{ field, message }];
  });
}

function throwIfAny(errors: readonly CatalogFieldError[]): void {
  if (errors.length > 0) {
    throw validationError(errors);
  }
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function price(value: unknown): string | number {
  return typeof value === 'number' ? value : text(value);
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text) : [];
}

function integer(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function optionalTextList(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) ? value.map(text) : undefined;
}

/** `subscription_type_id` is writable only at creation (contracts/subscriptions-service.md). */
const CREATE_ALLOWED_FIELDS: ReadonlySet<string> = new Set([
  ...WRITABLE_FIELDS,
  'subscription_type_id',
]);

/** The body of a creation (S3), once it is valid. */
export function validateCreate(body: unknown): SubscriptionInput {
  const data = objectBody(body);
  const typeError = subscriptionTypeIdError(data.subscription_type_id);
  throwIfAny([
    ...notAllowed(data, CREATE_ALLOWED_FIELDS),
    ...(typeError === null ? [] : [{ field: 'subscription_type_id', message: typeError }]),
    ...fieldErrors(data, { onlyPresent: false }),
  ]);
  return {
    name: text(data.name),
    description: typeof data.description === 'string' ? data.description : null,
    subscription_type_id: integer(data.subscription_type_id),
    monthly_price: price(data.monthly_price),
    annual_price: price(data.annual_price),
    trial_days: optionalInteger(data.trial_days),
    self_service: optionalBoolean(data.self_service),
    module_keys: optionalTextList(data.module_keys),
    other_features: optionalTextList(data.other_features),
    consulting_rooms_limit: integer(data.consulting_rooms_limit),
    doctors_limit: integer(data.doctors_limit),
    assistants_limit: integer(data.assistants_limit),
    new_patients_per_year_limit: integer(data.new_patients_per_year_limit),
  };
}

/**
 * `subscription_type_id` is excluded from the generic "not allowed" check (`notAllowed` below) so
 * that sending it gets this operation's own immutability message instead of the generic "field not
 * allowed" one — same distinction the real API makes (contracts/subscriptions-service.md).
 */
const UPDATE_KNOWN_FIELDS: ReadonlySet<string> = new Set([
  ...WRITABLE_FIELDS,
  'subscription_type_id',
]);

/** The body of an edition (S4), once it is valid: at least one datum, and only those received. */
export function validateUpdate(body: unknown): SubscriptionChanges {
  const data = objectBody(body);
  if (Object.keys(data).length === 0) {
    throw validationError([{ field: 'body', message: MESSAGES.emptyUpdate }]);
  }
  const errors = [
    ...notAllowed(data, UPDATE_KNOWN_FIELDS),
    ...fieldErrors(data, { onlyPresent: true }),
  ];
  if ('subscription_type_id' in data) {
    errors.push({ field: 'subscription_type_id', message: MESSAGES.subscriptionTypeImmutable });
  }
  throwIfAny(errors);
  return {
    ...('name' in data ? { name: text(data.name) } : {}),
    ...('description' in data
      ? { description: typeof data.description === 'string' ? data.description : null }
      : {}),
    ...('monthly_price' in data ? { monthly_price: price(data.monthly_price) } : {}),
    ...('annual_price' in data ? { annual_price: price(data.annual_price) } : {}),
    ...('trial_days' in data ? { trial_days: integer(data.trial_days) } : {}),
    ...('self_service' in data ? { self_service: data.self_service === true } : {}),
    ...('module_keys' in data ? { module_keys: textList(data.module_keys) } : {}),
    ...('other_features' in data ? { other_features: textList(data.other_features) } : {}),
    ...('consulting_rooms_limit' in data
      ? { consulting_rooms_limit: integer(data.consulting_rooms_limit) }
      : {}),
    ...('doctors_limit' in data ? { doctors_limit: integer(data.doctors_limit) } : {}),
    ...('assistants_limit' in data ? { assistants_limit: integer(data.assistants_limit) } : {}),
    ...('new_patients_per_year_limit' in data
      ? { new_patients_per_year_limit: integer(data.new_patients_per_year_limit) }
      : {}),
  };
}

/**
 * The status asked for in a change of status (S5): a whole number, without other fields. Whether
 * the operation admits it (1, 2 or 3) is a rule of the model.
 */
export function validateStatusChange(body: unknown): number {
  const data = objectBody(body);
  const statusId = data.status_id;
  const errors = notAllowed(data, new Set(['status_id']));
  if (typeof statusId !== 'number' || !Number.isInteger(statusId)) {
    errors.push({ field: 'status_id', message: MESSAGES.statusRequired });
  }
  throwIfAny(errors);
  return typeof statusId === 'number' ? statusId : 0;
}

/**
 * The id of the address, `/api/v1/subscriptions/{subscription_id}`: a whole positive number, or a
 * 422. One bigger than the largest id of the API is valid, and simply does not exist (a 404).
 */
export function readSubscriptionId(params: PathParams): number {
  const value = params.subscriptionId;
  const raw = typeof value === 'string' ? value : '';
  if (!/^\d+$/.test(raw) || Number(raw) === 0) {
    throw validationError([{ field: 'subscription_id', message: MESSAGES.idInvalid }]);
  }
  return Number(raw);
}
