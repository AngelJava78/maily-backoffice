import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import { getFullName, type PlatformUser } from '../schemas/user';
import { StatusChip } from './StatusChip';

/**
 * The user that a search by email found, of any status, with the way to its detail. A blocked or
 * a deleted user can only be reached from here, since the list does not show them.
 */
export function UserSearchResult({
  user,
  listSearch,
}: {
  readonly user: PlatformUser;
  /** The search that led here, carried to the detail to come back to it. */
  readonly listSearch: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" component="p" sx={{ overflowWrap: 'anywhere' }}>
            {getFullName(user)}
          </Typography>
          <StatusChip status={user.status} />
        </Stack>
        <Typography sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography>
        <Typography variant="body2" color="text.secondary">
          {messages.users.list.columns.createdAt}:{' '}
          <time dateTime={user.createdAt}>{formatDateTime(user.createdAt)}</time>
        </Typography>
        <div>
          <Link component={RouterLink} to={`/users/${user.id}`} state={{ listSearch }}>
            {messages.users.search.viewDetail}
          </Link>
        </div>
      </Stack>
    </Paper>
  );
}
