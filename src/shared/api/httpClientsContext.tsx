import { createContext, useContext } from 'react';

import type { HttpClient } from './httpClient';

/** The HTTP clients of the platform services; each feature picks the one it needs. */
/** A client of another service, named as the screens show it. */
export interface NamedHttpClient {
  readonly code: string;
  readonly name: string;
  readonly client: HttpClient;
}

export interface HttpClients {
  readonly users: HttpClient;
  /**
   * The client of `maily-system-api` (`VITE_SUBSCRIPTIONS_API_URL`): the subscriptions (feature 003)
   * and the summary of the Panel (feature 007) are two routers of that same service, so they share
   * it (research D3 of feature 007).
   */
  readonly subscriptions: HttpClient;
  /**
   * Anonymous clients of other services configured when the application is built (feature 016),
   * only for their public routes of health: they never receive the token.
   */
  readonly healthServices: readonly NamedHttpClient[];
}

export const HttpClientsContext = createContext<HttpClients | null>(null);

export function useHttpClients(): HttpClients {
  const clients = useContext(HttpClientsContext);
  if (clients === null) {
    throw new Error('useHttpClients must be used inside an HttpClientsContext provider');
  }
  return clients;
}
