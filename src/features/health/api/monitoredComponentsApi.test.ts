import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createSubscriptionsClient } from '@/test/subscriptionsClient';

import type { CreateComponentPayload } from '../schemas/componentForm';
import {
  createMonitoredComponent,
  deleteMonitoredComponent,
  getMonitoredComponent,
  listMonitoredComponents,
  MONITORED_COMPONENTS_PATH,
  updateMonitoredComponent,
} from './monitoredComponentsApi';

const USUARIOS: CreateComponentPayload = {
  code: 'mailysoft-usuarios',
  name: 'MailySoft Usuarios',
  kind: 'service',
  base_url: 'http://mailysoft-usuarios:8000',
  live_path: '/health/live',
  ready_path: '/health/ready',
  info_path: '/info',
  enabled: true,
  sort_order: 10,
};

describe('the API of the registry (R1 to R5)', () => {
  it('registers, reads, lists, modifies and deletes a component with the token', async () => {
    const health = createHealthMonitoringMock();
    const { client, authorization } = createSubscriptionsClient();

    const created = await createMonitoredComponent(client, USUARIOS);
    expect(created).toMatchObject({ code: 'mailysoft-usuarios', baseUrl: USUARIOS.base_url });
    expect(await getMonitoredComponent(client, created.id)).toEqual(created);
    expect(await listMonitoredComponents(client)).toEqual([created]);
    expect(
      await updateMonitoredComponent(client, created.id, { name: 'Usuarios', enabled: false }),
    ).toMatchObject({ name: 'Usuarios', enabled: false });
    await expect(deleteMonitoredComponent(client, created.id)).resolves.toBeUndefined();

    const detail = `${MONITORED_COMPONENTS_PATH}/${created.id}`;
    expect(health.requests.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: 'POST', path: MONITORED_COMPONENTS_PATH, body: USUARIOS },
      { method: 'GET', path: detail, body: null },
      { method: 'GET', path: MONITORED_COMPONENTS_PATH, body: null },
      { method: 'PATCH', path: detail, body: { name: 'Usuarios', enabled: false } },
      { method: 'DELETE', path: detail, body: null },
    ]);
    expect(health.requests.every((request) => request.authorization === authorization)).toBe(true);
  });

  it('passes a refusal of a field on as an ApiError with its fields (422)', async () => {
    const health = createHealthMonitoringMock();
    health.setAllowedHosts(['otro-servicio']);
    const { client } = createSubscriptionsClient();

    const failure: unknown = await createMonitoredComponent(client, USUARIOS).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 422,
      code: 'validation_error',
      fieldErrors: [{ field: 'base_url' }],
    });
  });

  it('passes a component that does not exist on as a 404', async () => {
    createHealthMonitoringMock();
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getMonitoredComponent(
      client,
      '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f60',
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 404, code: 'monitored_component_not_found' });
  });
});
