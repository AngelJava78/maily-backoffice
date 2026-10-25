import { z } from 'zod';

import type { HttpClient } from '@/shared/api/httpClient';

import type { CreateComponentPayload, UpdateComponentPayload } from '../schemas/componentForm';
import {
  monitoredComponentListSchema,
  monitoredComponentSchema,
  type MonitoredComponent,
} from '../schemas/monitoredComponent';

/**
 * The registry of components of maily-system-api (contracts/monitored-components.md, R1 to R5),
 * asked with the client of that service, with the token (research D4). The paths of the API stay in
 * this layer, so a change of contract does not reach the components.
 */
export const MONITORED_COMPONENTS_PATH = '/api/v1/monitored-components';

interface Cancellable {
  readonly signal?: AbortSignal;
}

const detailPath = (componentId: string): string => `${MONITORED_COMPONENTS_PATH}/${componentId}`;

/** R1: every component that is not deleted, enabled or not, in the order of the service. */
export function listMonitoredComponents(
  client: HttpClient,
  { signal }: Cancellable = {},
): Promise<MonitoredComponent[]> {
  return client.get(MONITORED_COMPONENTS_PATH, { schema: monitoredComponentListSchema, signal });
}

/** R2: one component; a deleted one is a 404, as one that never existed. */
export function getMonitoredComponent(
  client: HttpClient,
  componentId: string,
  { signal }: Cancellable = {},
): Promise<MonitoredComponent> {
  return client.get(detailPath(componentId), { schema: monitoredComponentSchema, signal });
}

/** R3: registers a component; the service answers with it as it was kept. */
export function createMonitoredComponent(
  client: HttpClient,
  payload: CreateComponentPayload,
  { signal }: Cancellable = {},
): Promise<MonitoredComponent> {
  return client.request({
    path: MONITORED_COMPONENTS_PATH,
    method: 'POST',
    body: payload,
    schema: monitoredComponentSchema,
    signal,
  });
}

/** R4: changes the data it receives, and only those; never the code nor the kind (FR-037). */
export function updateMonitoredComponent(
  client: HttpClient,
  componentId: string,
  payload: UpdateComponentPayload,
  { signal }: Cancellable = {},
): Promise<MonitoredComponent> {
  return client.request({
    path: detailPath(componentId),
    method: 'PATCH',
    body: payload,
    schema: monitoredComponentSchema,
    signal,
  });
}

/** R5: deletes a component logically: it stops being monitored and its code is free again. */
export async function deleteMonitoredComponent(
  client: HttpClient,
  componentId: string,
  { signal }: Cancellable = {},
): Promise<void> {
  // The client validates every answer, even an empty one: an empty body is read as `undefined`.
  await client.request({
    path: detailPath(componentId),
    method: 'DELETE',
    schema: z.undefined(),
    signal,
  });
}
