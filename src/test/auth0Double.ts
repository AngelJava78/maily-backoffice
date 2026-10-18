import { initialContext, type Auth0ContextInterface, type User } from '@auth0/auth0-react';
import { vi, type Mock } from 'vitest';

/** The part of the Auth0 state tests need to change. */
export interface Auth0State {
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly user: User | undefined;
  readonly error: Error | undefined;
}

type AccessTokenSilently = Auth0ContextInterface['getAccessTokenSilently'];

// `getAccessTokenSilently` has two overloads, so a plain mock cannot take its place: the types of
// both are read from the SDK and a function with the same two overloads delegates to the mock.
type AccessTokenSilentlyOverloads = AccessTokenSilently extends {
  (...args: infer VerboseArgs): infer VerboseResult;
  (...args: infer PlainArgs): infer PlainResult;
}
  ? {
      verbose: (...args: VerboseArgs) => VerboseResult;
      plain: (...args: PlainArgs) => PlainResult;
    }
  : never;

function delegateAccessTokenSilently(
  mock: Mock<AccessTokenSilentlyOverloads['plain']>,
): AccessTokenSilently {
  type Verbose = AccessTokenSilentlyOverloads['verbose'];
  type Plain = AccessTokenSilentlyOverloads['plain'];

  function getAccessTokenSilently(...args: Parameters<Verbose>): ReturnType<Verbose>;
  function getAccessTokenSilently(...args: Parameters<Plain>): ReturnType<Plain>;
  function getAccessTokenSilently(
    ...args: Parameters<Plain>
  ): Promise<Awaited<ReturnType<Verbose>> | Awaited<ReturnType<Plain>>> {
    return mock(...args);
  }
  return getAccessTokenSilently;
}

/** The methods of Auth0 that the application calls, as typed mocks to make assertions on. */
export interface Auth0Mocks {
  loginWithRedirect: Mock<Auth0ContextInterface['loginWithRedirect']>;
  logout: Mock<Auth0ContextInterface['logout']>;
  getAccessTokenSilently: Mock<AccessTokenSilentlyOverloads['plain']>;
  getIdTokenClaims: Mock<Auth0ContextInterface['getIdTokenClaims']>;
}

/** What `useAuth0()` returns, plus the mocks behind its methods. */
export interface Auth0Double extends Auth0ContextInterface {
  readonly mocks: Auth0Mocks;
}

/** An Auth0 user with only the claims the application reads (`sub`, `email`). */
export function auth0User(overrides: Partial<User> = {}): User {
  return { sub: 'auth0|user1', email: 'ana@clinica.com', ...overrides };
}

/**
 * A stand-in for the value `useAuth0()` returns. It starts signed out and finished loading; the
 * state can be overridden, and the access token it hands out is `test-token:<sub>`.
 */
export function createAuth0Double(overrides: Partial<Auth0State> = {}): Auth0Double {
  const state: Auth0State = {
    isLoading: false,
    isAuthenticated: false,
    user: undefined,
    error: undefined,
    ...overrides,
  };
  const mocks: Auth0Mocks = {
    loginWithRedirect: vi.fn<Auth0ContextInterface['loginWithRedirect']>().mockResolvedValue(),
    logout: vi.fn<Auth0ContextInterface['logout']>().mockResolvedValue(),
    getAccessTokenSilently: vi
      .fn<AccessTokenSilentlyOverloads['plain']>()
      .mockResolvedValue(`test-token:${state.user?.sub ?? ''}`),
    getIdTokenClaims: vi
      .fn<Auth0ContextInterface['getIdTokenClaims']>()
      .mockResolvedValue(undefined),
  };

  return {
    ...initialContext,
    ...state,
    loginWithRedirect: mocks.loginWithRedirect,
    logout: mocks.logout,
    getAccessTokenSilently: delegateAccessTokenSilently(mocks.getAccessTokenSilently),
    getIdTokenClaims: mocks.getIdTokenClaims,
    mocks,
  };
}
