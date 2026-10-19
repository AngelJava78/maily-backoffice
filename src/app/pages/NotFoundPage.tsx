import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';

import { messages } from '@/shared/messages/es';
import { useFocusOnMount } from '@/shared/ui/useFocusOnMount';

/** What an address that does not exist shows to someone who has access (FR-016). */
export function NotFoundPage() {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" ref={headingRef} tabIndex={-1}>
        {messages.notFound.title}
      </Typography>
      <Typography>{messages.notFound.message}</Typography>
      <div>
        <Button variant="contained" component={Link} to="/">
          {messages.notFound.backHome}
        </Button>
      </div>
    </Stack>
  );
}
