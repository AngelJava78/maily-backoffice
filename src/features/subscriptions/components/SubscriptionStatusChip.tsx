import Chip from '@mui/material/Chip';

import { messages } from '@/shared/messages/es';

import { SUBSCRIPTION_STATUS } from '../schemas/subscriptionStatus';

const KNOWN_STATUSES = new Map<number, { label: string; color: 'success' | 'warning' | 'default' }>(
  [
    [SUBSCRIPTION_STATUS.ACTIVE, { label: messages.subscriptions.status.active, color: 'success' }],
    [
      SUBSCRIPTION_STATUS.INACTIVE,
      { label: messages.subscriptions.status.inactive, color: 'default' },
    ],
    [
      SUBSCRIPTION_STATUS.BLOCKED,
      { label: messages.subscriptions.status.blocked, color: 'warning' },
    ],
  ],
);

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
    <Chip size="small" label={status.name} variant="outlined" />
  ) : (
    <Chip size="small" label={known.label} color={known.color} />
  );
}
