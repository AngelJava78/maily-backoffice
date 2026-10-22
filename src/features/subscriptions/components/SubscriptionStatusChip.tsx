import { messages } from '@/shared/messages/es';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';

import { SUBSCRIPTION_STATUS } from '../schemas/subscriptionStatus';

const KNOWN_STATUSES = new Map<number, { label: string; tone: BadgeTone }>([
  [SUBSCRIPTION_STATUS.ACTIVE, { label: messages.subscriptions.status.active, tone: 'success' }],
  [
    SUBSCRIPTION_STATUS.INACTIVE,
    { label: messages.subscriptions.status.inactive, tone: 'neutral' },
  ],
  [SUBSCRIPTION_STATUS.BLOCKED, { label: messages.subscriptions.status.blocked, tone: 'warning' }],
]);

/**
 * The status of a subscription as a text with a colour. The text carries the meaning, the colour
 * only reinforces it (WCAG 1.4.1), and the rows are never dimmed. It decides by the id of the
 * status, never by the name the API gives it; a status it does not know shows the name of the API,
 * with an outline.
 */
export function SubscriptionStatusChip({
  status,
}: {
  readonly status: { readonly id: number; readonly name: string };
}) {
  const known = KNOWN_STATUSES.get(status.id);
  return known === undefined ? (
    <Badge label={status.name} tone="neutral" variant="outlined" />
  ) : (
    <Badge label={known.label} tone={known.tone} />
  );
}
