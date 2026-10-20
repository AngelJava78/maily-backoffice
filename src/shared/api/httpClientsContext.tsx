import { createContext, useContext } from 'react';

import type { HttpClient } from './httpClient';

/** The HTTP clients of the platform services; each feature picks the one it needs. */
export interface HttpClients {
  readonly users: HttpClient;
  readonly subscriptions: HttpClient;
}

export const HttpClientsContext = createContext<HttpClients | null>(null);

export function useHttpClients(): HttpClients {
  const clients = useContext(HttpClientsContext);
  if (clients === null) {
    throw new Error('useHttpClients must be used inside an HttpClientsContext provider');
  }
  return clients;
}
