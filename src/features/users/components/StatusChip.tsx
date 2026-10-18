import Chip from '@mui/material/Chip';

import { messages } from '@/shared/messages/es';

import { USER_STATUS } from '../schemas/userStatus';

const KNOWN_STATUSES = new Map<number, { label: string; color: 'success' | 'warning' | 'default' }>(
  [
    [USER_STATUS.ACTIVE, { label: messages.users.status.active, color: 'success' }],
    [USER_STATUS.BLOCKED, { label: messages.users.status.blocked, color: 'warning' }],
    [USER_STATUS.DELETED, { label: messages.users.status.deleted, color: 'default' }],
  ],
);

/**
 * The status of a user as a text with a colour. The text carries the meaning, the colour only
 * reinforces it (WCAG 1.4.1). It decides by the id of the status, never by the name the service
 * gives it; a status it does not know shows the name of the catalog.
 */
export function StatusChip({
  status,
}: {
  readonly status: { readonly id: number; readonly name: string };
}) {
  const known = KNOWN_STATUSES.get(status.id);
  return (
    <Chip size="small" label={known?.label ?? status.name} color={known?.color ?? 'default'} />
  );
}
