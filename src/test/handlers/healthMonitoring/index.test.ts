import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '../../subscriptionsClient';
import { ADMIN_SUB, createUsersDirectoryMock } from '../usersDirectory';
import { createHealthMonitoringMock } from './index';

/** The `sub` the simulator of the users service knows as the administrator. */
const admin = ADMIN_SUB;

describe('createHealthMonitoringMock: the aggregator', () => {
  it('answers 200 without caching, with the two integrated components', async () => {
    createHealthMonitoringMock();

    const answer = await callSubscriptions('/api/v1/health');

    expect(answer.status).toBe(200);
    expect(answer.headers.get('cache-control')).toBe('no-store');
    expect(answer.body).toMatchObject({
      status: 'ok',
      registry_available: true,
      components: [{ code: 'maily-system-api' }, { code: 'database' }],
    });
  });

  it('asks the users service for health:read, which the administrator lacks by default', async () => {
    const directory = createUsersDirectoryMock();
    createHealthMonitoringMock({ directory });

    expect((await callSubscriptions('/api/v1/health', { sub: admin })).status).toBe(403);

    directory.grant('Administrator', 'health:read');

    expect((await callSubscriptions('/api/v1/health', { sub: admin })).status).toBe(200);
  });

  it('answers 401 without a token', async () => {
    createHealthMonitoringMock();

    expect((await callSubscriptions('/api/v1/health', { sub: null })).status).toBe(401);
  });

  it('answers 503 when the users API does not answer', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();

    const answer = await callSubscriptions('/api/v1/health');

    expect(answer).toMatchObject({ status: 503, body: { code: 'authorization_unavailable' } });
  });

  it('says when it could not read the registry', async () => {
    const health = createHealthMonitoringMock();
    health.setRegistryUnavailable(true);

    expect((await callSubscriptions('/api/v1/health')).body).toMatchObject({
      registry_available: false,
    });
  });

  it('works out the overall status from the components a test changed', async () => {
    const health = createHealthMonitoringMock();

    health.setComponentStatus('database', 'stopped', { next_start_at: '2026-11-02T14:00:00Z' });

    expect((await callSubscriptions('/api/v1/health')).body).toMatchObject({
      status: 'degraded',
      components: [
        { code: 'maily-system-api' },
        { code: 'database', status: 'stopped', next_start_at: '2026-11-02T14:00:00Z' },
      ],
    });
  });

  it('adds the enabled registered components, by order and code, and leaves out the rest', async () => {
    const component = {
      base_url: 'http://127.0.0.1:8000',
      live_path: '/health/live',
      ready_path: '/health/ready',
      info_path: '/info',
      created_at: '2026-10-24T17:00:00Z',
      updated_at: '2026-10-24T17:00:00Z',
      deleted_at: null,
      kind: 'service' as const,
    };
    createHealthMonitoringMock({
      registered: [
        { ...component, id: 'b', code: 'zeta', name: 'Zeta', enabled: true, sort_order: 1 },
        { ...component, id: 'a', code: 'alfa', name: 'Alfa', enabled: true, sort_order: 1 },
        { ...component, id: 'c', code: 'off', name: 'Off', enabled: false, sort_order: 0 },
        {
          ...component,
          id: 'd',
          code: 'gone',
          name: 'Gone',
          enabled: true,
          sort_order: 0,
          deleted_at: '2026-10-24T18:00:00Z',
        },
      ],
    });

    const answer = await callSubscriptions('/api/v1/health');

    expect(answer.body).toMatchObject({
      components: [
        { code: 'maily-system-api' },
        { code: 'database' },
        { code: 'alfa' },
        { code: 'zeta' },
      ],
    });
  });

  it('records the requests it receives', async () => {
    const health = createHealthMonitoringMock();

    await callSubscriptions('/api/v1/health');

    expect(health.requestsTo('GET', '/api/v1/health')).toHaveLength(1);
  });
});
