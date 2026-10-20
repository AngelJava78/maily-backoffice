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
  'features',
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
  featuresNotList: 'Lo que incluye la suscripción debe ser una lista de textos.',
  featuresTooMany: 'Lo que incluye la suscripción no puede tener más de 20 elementos.',
  featureLength: 'Cada elemento de lo que incluye la suscripción debe tener de 1 a 150 caracteres.',
  statusRequired: 'El estatus es obligatorio y debe ser un número entero.',
  idInvalid: 'El identificador de la suscripción debe ser un número entero positivo.',
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

function priceError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return MESSAGES.priceRequired;
  }
  if (typeof value === 'number') {
    return value >= 0 && PRICE_TEXT.test(String(value)) ? null : MESSAGES.priceInvalid;
  }
  return typeof value === 'string' && PRICE_TEXT.test(value.trim()) ? null : MESSAGES.priceInvalid;
}

function featuresError(value: unknown): string | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return MESSAGES.featuresNotList;
  }
  if (value.length > 20) {
    return MESSAGES.featuresTooMany;
  }
  const valid = value.every((item: string) => {
    const length = item.trim().length;
    return length >= 1 && length <= 150;
  });
  return valid ? null : MESSAGES.featureLength;
}

const CHECKS: readonly (readonly [string, (value: unknown) => string | null])[] = [
  ['name', nameError],
  ['description', descriptionError],
  ['monthly_price', priceError],
  ['features', featuresError],
];

/** The errors of the writable fields; `onlyPresent` limits them to the ones the body carries. */
function fieldErrors(body: JsonObject, { onlyPresent }: { readonly onlyPresent: boolean }) {
  return CHECKS.flatMap(([field, check]) => {
    if (onlyPresent && !(field in body)) {
      return [];
    }
    // `features` may be left out of a creation: it is an empty list by default.
    if (!onlyPresent && field === 'features' && !('features' in body)) {
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

/** The body of a creation (S3), once it is valid. */
export function validateCreate(body: unknown): SubscriptionInput {
  const data = objectBody(body);
  throwIfAny([...notAllowed(data, WRITABLE_FIELDS), ...fieldErrors(data, { onlyPresent: false })]);
  return {
    name: text(data.name),
    description: typeof data.description === 'string' ? data.description : null,
    monthly_price: price(data.monthly_price),
    features: textList(data.features),
  };
}

/** The body of an edition (S4), once it is valid: at least one datum, and only those received. */
export function validateUpdate(body: unknown): SubscriptionChanges {
  const data = objectBody(body);
  if (Object.keys(data).length === 0) {
    throw validationError([{ field: 'body', message: MESSAGES.emptyUpdate }]);
  }
  throwIfAny([...notAllowed(data, WRITABLE_FIELDS), ...fieldErrors(data, { onlyPresent: true })]);
  return {
    ...('name' in data ? { name: text(data.name) } : {}),
    ...('description' in data
      ? { description: typeof data.description === 'string' ? data.description : null }
      : {}),
    ...('monthly_price' in data ? { monthly_price: price(data.monthly_price) } : {}),
    ...('features' in data ? { features: textList(data.features) } : {}),
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
