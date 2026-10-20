import type { TokenFailureKind } from '../api/tokenFailure';
import type { IssuedToken } from '../schemas/accessToken';

/** The state of the screen (data-model.md, `TokenScreenState`). It lives nowhere else. */
export interface TokenScreenState {
  /** The token on screen, hidden or visible; `null` until the first one arrives. */
  readonly token: IssuedToken | null;
  /** Whether the whole token is visible. Hidden by default (FR-010). */
  readonly revealed: boolean;
  /** `pending` while Auth0 is being waited for. */
  readonly status: 'idle' | 'pending';
  /** The last failure, until the next request. */
  readonly failure: TokenFailureKind | null;
  /**
   * The clock of the screen, in milliseconds since the Unix epoch. Only `issued` and `ticked`
   * write it, from a callback, so rendering never reads the clock (research D8). It means nothing
   * while there is no token.
   */
  readonly now: number;
}

export const initialTokenState: TokenScreenState = {
  token: null,
  revealed: false,
  status: 'idle',
  failure: null,
  now: 0,
};

export type TokenAction =
  | { readonly type: 'requested' }
  | { readonly type: 'issued'; readonly token: IssuedToken; readonly now: number }
  | { readonly type: 'failed'; readonly kind: TokenFailureKind }
  | { readonly type: 'revealToggled' }
  | { readonly type: 'ticked'; readonly now: number };

/**
 * The transitions of the screen, as pure functions (data-model.md). A failure keeps the token that
 * was on screen (FR-019); a new token always arrives hidden (FR-015).
 */
export function tokenReducer(state: TokenScreenState, action: TokenAction): TokenScreenState {
  switch (action.type) {
    case 'requested':
      return state.status === 'pending' ? state : { ...state, status: 'pending', failure: null };
    case 'issued':
      return {
        token: action.token,
        revealed: false,
        status: 'idle',
        failure: null,
        now: action.now,
      };
    case 'failed':
      return { ...state, status: 'idle', failure: action.kind };
    case 'revealToggled':
      return state.token === null ? state : { ...state, revealed: !state.revealed };
    case 'ticked':
      return { ...state, now: action.now };
  }
}
