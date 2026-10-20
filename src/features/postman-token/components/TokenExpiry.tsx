import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

interface TokenExpiryProps {
  /** When the token expires (ISO 8601), or `null` while there is no token. */
  readonly expiresAt: string | null;
  /** The token has reached its expiration. */
  readonly expired: boolean;
}

/**
 * The date and time at which the token expires, in the zone of the browser, and whether it is
 * still valid (FR-012): said in words, because colour alone is not enough (WCAG 1.4.1). While
 * there is no token it shows a dash and says nothing about validity. A label and its value, like
 * the fields of the profile.
 */
export function TokenExpiry({ expiresAt, expired }: TokenExpiryProps) {
  const text = messages.token;

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
        columnGap: 4,
        rowGap: 1,
      }}
    >
      <Typography component="dt" sx={{ fontWeight: 'bold' }}>
        {text.fields.expiresAt}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {expiresAt === null ? (
          text.emptyExpiry
        ) : (
          <>
            {formatDateTime(expiresAt)}{' '}
            <Chip
              size="small"
              variant="outlined"
              color={expired ? 'error' : 'success'}
              label={expired ? text.validity.expired : text.validity.valid}
            />
          </>
        )}
      </Typography>
    </Box>
  );
}
