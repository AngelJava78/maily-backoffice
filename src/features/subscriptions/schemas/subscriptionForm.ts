import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import { PRICE_INPUT_PATTERN, toCents } from './price';
import type { Subscription } from './subscription';

const text = messages.subscriptions.validation;

/** What a subscription includes has from 0 to 20 elements (S3). */
export const MAX_FEATURES = 20;

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
  monthlyPrice: z
    .string()
    .trim()
    .min(1, { error: text.priceRequired, abort: true })
    .regex(PRICE_INPUT_PATTERN, text.priceInvalid),
  // Each element is an object, as the field array of React Hook Form needs; its error goes next to
  // it (`features.<i>.value`) and the one of the whole list, above the list.
  features: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .min(1, { error: text.featureRequired, abort: true })
          .max(150, text.featureTooLong),
      }),
    )
    .max(MAX_FEATURES, text.featuresTooMany),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

/** What the form compares and shows of a subscription. */
type EditableData = Pick<Subscription, 'name' | 'description' | 'monthlyPrice' | 'features'>;

/** The body of `POST /api/v1/subscriptions` (S3). It is born Activa: no status is sent. */
export interface CreateSubscriptionBody {
  readonly name: string;
  readonly description?: string;
  readonly monthly_price: string;
  readonly features: readonly string[];
}

/** The body of `PATCH /api/v1/subscriptions/{id}` (S4): only what changed, at least one datum. */
export interface UpdateSubscriptionBody {
  readonly name?: string;
  /** `null` takes the description away. */
  readonly description?: string | null;
  readonly monthly_price?: string;
  /** The whole list, which replaces the one there was. */
  readonly features?: readonly string[];
}

/** The values the edition opens with: those of the subscription. */
export function toFormValues(subscription: EditableData): SubscriptionFormValues {
  return {
    name: subscription.name,
    description: subscription.description ?? '',
    monthlyPrice: subscription.monthlyPrice,
    features: subscription.features.map((value) => ({ value })),
  };
}

function trimmedFeatures(values: SubscriptionFormValues): string[] {
  return values.features.map(({ value }) => value.trim());
}

/**
 * The data a creation sends, trimmed, and nothing that is only read (FR-021): the price goes as
 * text, which keeps it exact, and an empty description is left out.
 */
export function toCreateSubscriptionBody(values: SubscriptionFormValues): CreateSubscriptionBody {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    ...(description === '' ? {} : { description }),
    monthly_price: values.monthlyPrice.trim(),
    features: trimmedFeatures(values),
  };
}

function sameList(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/**
 * Only what changed since the form was opened, so the edition of another person in other data is
 * kept (FR-012), or `null` when nothing changed and nothing has to be sent. Spaces around a text do
 * not count; a change of the upper case of the name does; prices are compared in cents.
 */
export function toUpdateSubscriptionBody(
  initial: EditableData,
  values: SubscriptionFormValues,
): UpdateSubscriptionBody | null {
  const name = values.name.trim();
  const description = values.description.trim();
  const monthlyPrice = values.monthlyPrice.trim();
  const features = trimmedFeatures(values);
  const body: UpdateSubscriptionBody = {
    ...(name === initial.name ? {} : { name }),
    ...(description === (initial.description ?? '')
      ? {}
      : { description: description === '' ? null : description }),
    ...(toCents(monthlyPrice) === toCents(initial.monthlyPrice)
      ? {}
      : { monthly_price: monthlyPrice }),
    ...(sameList(features, initial.features) ? {} : { features }),
  };
  return Object.keys(body).length === 0 ? null : body;
}
