import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import { CLINIC_MODULE_ORDER, type ClinicModuleKey } from './clinicModuleCatalog';
import { PRICE_INPUT_PATTERN, toCents } from './price';
import type { Subscription } from './subscription';

const text = messages.subscriptions.validation;

/** What a subscription includes has from 0 to 20 elements (S3). */
export const MAX_OTHER_FEATURES = 20;

/** A whole number written with digits only, at most `digits` long. */
const integerText = (digits: number) => new RegExp(`^\\d{1,${digits}}$`);
const TRIAL_DAYS_PATTERN = integerText(4);
const CLINIC_LIMIT_PATTERN = integerText(7);

const trialDaysSchema = z
  .string()
  .trim()
  .min(1, { error: text.trialDaysInvalid, abort: true })
  .regex(TRIAL_DAYS_PATTERN, { error: text.trialDaysInvalid })
  .refine((value) => Number(value) <= 3650, { error: text.trialDaysInvalid });

const clinicLimitSchema = (message: string) =>
  z
    .string()
    .trim()
    .min(1, { error: message, abort: true })
    .regex(CLINIC_LIMIT_PATTERN, { error: message })
    .refine((value) => Number(value) <= 1_000_000, { error: message });

const moduleKeysSchema = z.custom<ReadonlySet<ClinicModuleKey>>((value) => value instanceof Set);

// None of these schemas transforms its value (`trim` does not change the type), so what the form
// holds and what it submits have the same type. A check that fails stops the next ones, so an
// empty price is told as required and not also as invalid.
export const subscriptionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: text.nameRequired, abort: true })
    .max(100, text.nameTooLong),
  description: z.string().trim().max(500, text.descriptionTooLong),
  // A positive integer, not a union of 1|2 (same looseness as the API's own `subscription_type_id`
  // on create, research D1): the control always marks one of SUBSCRIPTION_TYPE_ORDER, so there is
  // no "required" message to show for it; a stricter union would also wrongly block editing any
  // other field of a subscription whose type the control cannot show (an id outside today's two,
  // which the schema of `Subscription` deliberately does not reject either).
  subscriptionTypeId: z.number().int().positive(),
  monthlyPrice: z
    .string()
    .trim()
    .min(1, { error: text.priceRequired, abort: true })
    .regex(PRICE_INPUT_PATTERN, text.priceInvalid),
  annualPrice: z
    .string()
    .trim()
    .min(1, { error: text.annualPriceRequired, abort: true })
    .regex(PRICE_INPUT_PATTERN, text.annualPriceInvalid),
  trialDays: trialDaysSchema,
  selfService: z.boolean(),
  moduleKeys: moduleKeysSchema,
  consultingRoomsLimit: clinicLimitSchema(text.consultingRoomsLimitInvalid),
  doctorsLimit: clinicLimitSchema(text.doctorsLimitInvalid),
  assistantsLimit: clinicLimitSchema(text.assistantsLimitInvalid),
  newPatientsPerYearLimit: clinicLimitSchema(text.newPatientsPerYearLimitInvalid),
  // Each element is an object, as the field array of React Hook Form needs; its error goes next to
  // it (`otherFeatures.<i>.value`) and the one of the whole list, above the list.
  otherFeatures: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .min(1, { error: text.otherFeatureRequired, abort: true })
          .max(150, text.otherFeatureTooLong),
      }),
    )
    .max(MAX_OTHER_FEATURES, text.otherFeaturesTooMany),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

/** What the form compares and shows of a subscription. */
type EditableData = Pick<
  Subscription,
  | 'name'
  | 'description'
  // Only read, to open the edition with it marked (toFormValues); never compared or sent back
  // (toUpdateSubscriptionBody): the subscription type is fixed forever once created (research D4).
  | 'subscriptionType'
  | 'monthlyPrice'
  | 'annualPrice'
  | 'trialDays'
  | 'selfService'
  | 'moduleKeys'
  | 'otherFeatures'
  | 'consultingRoomsLimit'
  | 'doctorsLimit'
  | 'assistantsLimit'
  | 'newPatientsPerYearLimit'
>;

/** The body of `POST /api/v1/subscriptions` (S3). It is born Activa: no status is sent. */
export interface CreateSubscriptionBody {
  readonly name: string;
  readonly description?: string;
  readonly subscription_type_id: number;
  readonly monthly_price: string;
  readonly annual_price: string;
  readonly trial_days: number;
  readonly self_service: boolean;
  readonly module_keys: readonly string[];
  readonly other_features: readonly string[];
  readonly consulting_rooms_limit: number;
  readonly doctors_limit: number;
  readonly assistants_limit: number;
  readonly new_patients_per_year_limit: number;
}

/** The body of `PATCH /api/v1/subscriptions/{id}` (S4): only what changed, at least one datum. */
export interface UpdateSubscriptionBody {
  readonly name?: string;
  /** `null` takes the description away. */
  readonly description?: string | null;
  readonly monthly_price?: string;
  readonly annual_price?: string;
  readonly trial_days?: number;
  readonly self_service?: boolean;
  /** The whole set, which replaces the one there was. */
  readonly module_keys?: readonly string[];
  /** The whole list, which replaces the one there was. */
  readonly other_features?: readonly string[];
  readonly consulting_rooms_limit?: number;
  readonly doctors_limit?: number;
  readonly assistants_limit?: number;
  readonly new_patients_per_year_limit?: number;
}

/** The values the edition opens with: those of the subscription. */
export function toFormValues(subscription: EditableData): SubscriptionFormValues {
  const knownKeys = new Set<string>(CLINIC_MODULE_ORDER);
  return {
    name: subscription.name,
    description: subscription.description ?? '',
    subscriptionTypeId: subscription.subscriptionType.id,
    monthlyPrice: subscription.monthlyPrice,
    annualPrice: subscription.annualPrice,
    trialDays: String(subscription.trialDays),
    selfService: subscription.selfService,
    // A key outside the fixed catalog (research D3) is dropped: it is not offered in the form.
    moduleKeys: new Set(
      subscription.moduleKeys.filter((key): key is ClinicModuleKey => knownKeys.has(key)),
    ),
    consultingRoomsLimit: String(subscription.consultingRoomsLimit),
    doctorsLimit: String(subscription.doctorsLimit),
    assistantsLimit: String(subscription.assistantsLimit),
    newPatientsPerYearLimit: String(subscription.newPatientsPerYearLimit),
    otherFeatures: subscription.otherFeatures.map((value) => ({ value })),
  };
}

function trimmedOtherFeatures(values: SubscriptionFormValues): string[] {
  return values.otherFeatures.map(({ value }) => value.trim());
}

/**
 * The data a creation sends, trimmed, and nothing that is only read (FR-021): the prices go as
 * text, which keeps them exact; the days, the limits and the modules go as numbers/a list; an empty
 * description is left out.
 */
export function toCreateSubscriptionBody(values: SubscriptionFormValues): CreateSubscriptionBody {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    ...(description === '' ? {} : { description }),
    subscription_type_id: values.subscriptionTypeId,
    monthly_price: values.monthlyPrice.trim(),
    annual_price: values.annualPrice.trim(),
    trial_days: Number(values.trialDays.trim()),
    self_service: values.selfService,
    module_keys: [...values.moduleKeys].sort(),
    other_features: trimmedOtherFeatures(values),
    consulting_rooms_limit: Number(values.consultingRoomsLimit.trim()),
    doctors_limit: Number(values.doctorsLimit.trim()),
    assistants_limit: Number(values.assistantsLimit.trim()),
    new_patients_per_year_limit: Number(values.newPatientsPerYearLimit.trim()),
  };
}

function sameList(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/** Whether two sets hold exactly the same elements, regardless of order. */
function sameSet(first: ReadonlySet<string>, second: ReadonlySet<string>): boolean {
  return first.size === second.size && [...first].every((value) => second.has(value));
}

/**
 * Only what changed since the form was opened, so the edition of another person in other data is
 * kept (FR-017), or `null` when nothing changed and nothing has to be sent. Spaces around a text do
 * not count; a change of the upper case of the name does; prices are compared in cents and the set
 * of modules, without regard to order.
 */
export function toUpdateSubscriptionBody(
  initial: EditableData,
  values: SubscriptionFormValues,
): UpdateSubscriptionBody | null {
  const name = values.name.trim();
  const description = values.description.trim();
  const monthlyPrice = values.monthlyPrice.trim();
  const annualPrice = values.annualPrice.trim();
  const trialDays = Number(values.trialDays.trim());
  const consultingRoomsLimit = Number(values.consultingRoomsLimit.trim());
  const doctorsLimit = Number(values.doctorsLimit.trim());
  const assistantsLimit = Number(values.assistantsLimit.trim());
  const newPatientsPerYearLimit = Number(values.newPatientsPerYearLimit.trim());
  const otherFeatures = trimmedOtherFeatures(values);
  const body: UpdateSubscriptionBody = {
    ...(name === initial.name ? {} : { name }),
    ...(description === (initial.description ?? '')
      ? {}
      : { description: description === '' ? null : description }),
    ...(toCents(monthlyPrice) === toCents(initial.monthlyPrice)
      ? {}
      : { monthly_price: monthlyPrice }),
    ...(toCents(annualPrice) === toCents(initial.annualPrice) ? {} : { annual_price: annualPrice }),
    ...(trialDays === initial.trialDays ? {} : { trial_days: trialDays }),
    ...(values.selfService === initial.selfService ? {} : { self_service: values.selfService }),
    ...(sameSet(values.moduleKeys, new Set(initial.moduleKeys))
      ? {}
      : { module_keys: [...values.moduleKeys].sort() }),
    ...(consultingRoomsLimit === initial.consultingRoomsLimit
      ? {}
      : { consulting_rooms_limit: consultingRoomsLimit }),
    ...(doctorsLimit === initial.doctorsLimit ? {} : { doctors_limit: doctorsLimit }),
    ...(assistantsLimit === initial.assistantsLimit ? {} : { assistants_limit: assistantsLimit }),
    ...(newPatientsPerYearLimit === initial.newPatientsPerYearLimit
      ? {}
      : { new_patients_per_year_limit: newPatientsPerYearLimit }),
    ...(sameList(otherFeatures, initial.otherFeatures) ? {} : { other_features: otherFeatures }),
  };
  return Object.keys(body).length === 0 ? null : body;
}
