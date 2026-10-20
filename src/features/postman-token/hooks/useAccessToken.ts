import { useAuth0 } from '@auth0/auth0-react';
import { useReducer, useRef } from 'react';

import { logger } from '@/shared/lib/logger';

import { requestAccessToken } from '../api/requestAccessToken';
import { classifyTokenError, type TokenFailureKind } from '../api/tokenFailure';
import type { IssuedToken } from '../schemas/accessToken';
import { initialTokenState, tokenReducer } from './tokenReducer';
import { useExpiryTimer } from './useExpiryTimer';

/** What the Token screen needs of the token, and the two things it can ask for. */
export interface AccessTokenController {
  /** The token on screen, hidden or visible; `null` until the first one arrives. */
  readonly token: IssuedToken | null;
  readonly revealed: boolean;
  /** Auth0 is being waited for. */
  readonly isPending: boolean;
  /** Why the last request failed, until the next one. */
  readonly failure: TokenFailureKind | null;
  /** The token on screen has reached its expiration. */
  readonly isExpired: boolean;
  /** "Generar" or "Refrescar": asks Auth0 for a new token. Ignored while one is being waited for. */
  readonly request: () => void;
  /** "Mostrar" or "Ocultar". */
  readonly toggleReveal: () => void;
}

/**
 * The state of the Token screen (research D7): the token, whether it is visible, the wait and the
 * last failure, in a reducer of the component. The token is not server state of the backoffice and
 * is kept nowhere else, so leaving the screen, reloading, logging out or losing the permission
 * discards it without any cleaning.
 */
export function useAccessToken(): AccessTokenController {
  const { getAccessTokenSilently } = useAuth0();
  const [state, dispatch] = useReducer(tokenReducer, initialTokenState);
  // The reducer ignores a second request, but two calls made before the screen draws again would
  // both reach Auth0 (FR-016).
  const waiting = useRef(false);

  useExpiryTimer(state.token?.expiresAt ?? null, state.now, dispatch);

  function request(): void {
    if (waiting.current) {
      return;
    }
    waiting.current = true;
    dispatch({ type: 'requested' });
    requestAccessToken((options) => getAccessTokenSilently(options)).then(
      (token) => {
        waiting.current = false;
        dispatch({ type: 'issued', token, now: Date.now() });
      },
      (error: unknown) => {
        waiting.current = false;
        const kind = classifyTokenError(error);
        // A session that ended is expected; neither the token nor the SDK error are ever logged.
        if (kind !== 'session-expired') {
          logger.error('Could not obtain the access token', { kind });
        }
        dispatch({ type: 'failed', kind });
      },
    );
  }

  return {
    token: state.token,
    revealed: state.revealed,
    isPending: state.status === 'pending',
    failure: state.failure,
    isExpired: state.token !== null && state.now >= Date.parse(state.token.expiresAt),
    request,
    toggleReveal: () => {
      dispatch({ type: 'revealToggled' });
    },
  };
}
