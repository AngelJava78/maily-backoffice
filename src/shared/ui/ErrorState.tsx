import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

import { messages } from '@/shared/messages/es';

interface ErrorStateProps {
  readonly title: string;
  /** Element of the title: a heading when the state is the whole page. A plain block by default. */
  readonly titleComponent?: 'div' | 'h1' | 'h2' | 'h3';
  readonly message: string;
  /** When given, a retry button is offered. */
  readonly onRetry?: () => void;
  /** Another way out, such as logging out. */
  readonly secondaryAction?: ReactNode;
}

/** Error shown in place of the content that could not be loaded. */
export function ErrorState({
  title,
  titleComponent = 'div',
  message,
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <Alert severity="error">
      <AlertTitle component={titleComponent}>{title}</AlertTitle>
      {message}
      {(onRetry !== undefined || secondaryAction !== undefined) && (
        <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {onRetry !== undefined && (
            <Button variant="contained" onClick={onRetry}>
              {messages.common.retry}
            </Button>
          )}
          {secondaryAction}
        </Stack>
      )}
    </Alert>
  );
}
