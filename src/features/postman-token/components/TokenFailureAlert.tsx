import Button from '@mui/material/Button';

import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import type { TokenFailureKind } from '../api/tokenFailure';

interface TokenFailureAlertProps {
  readonly kind: TokenFailureKind;
  /** Repeats the last action: "Generar" or "Refrescar". */
  readonly onRetry: () => void;
  /** Only offered when the session ended. */
  readonly onSignInAgain: () => void;
}

const COPY_KEYS = {
  'session-expired': 'sessionExpired',
  'unreadable-token': 'unreadableToken',
  unknown: 'unknown',
} as const satisfies Record<TokenFailureKind, keyof typeof messages.token.errors>;

/**
 * Says why the token could not be obtained (contracts/app-routes.md, "Alerta de fallo"), always
 * with "Reintentar", and with "Iniciar sesión de nuevo" when the session is the problem: it is the
 * way out that constitution V allows this tool instead of redirecting at once. Never shows what the
 * SDK said.
 */
export function TokenFailureAlert({ kind, onRetry, onSignInAgain }: TokenFailureAlertProps) {
  const copy = messages.token.errors[COPY_KEYS[kind]];

  return (
    <ErrorState
      title={copy.title}
      message={copy.message}
      onRetry={onRetry}
      secondaryAction={
        kind === 'session-expired' ? (
          <Button variant="outlined" onClick={onSignInAgain}>
            {messages.token.actions.signInAgain}
          </Button>
        ) : undefined
      }
    />
  );
}
