import { describe, expect, it } from 'vitest';

import { SUBSCRIPTIONS_API_BASE_URL } from '../subscriptionsCatalog/baseUrl';
import { createHealthProbesMock, PATIENTS_BASE_URL } from './index';

async function get(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  return { status: response.status, text };
}

describe('createHealthProbesMock', () => {
  it('answers both routes of every service as up by default, and records each request', async () => {
    const probes = createHealthProbesMock();

    expect(await get(`${PATIENTS_BASE_URL}/health/live`)).toEqual({
      status: 200,
      text: '{"status":"ok"}',
    });
    expect((await get(`${SUBSCRIPTIONS_API_BASE_URL}/health/ready`)).status).toBe(200);
    expect(probes.requestsOf(PATIENTS_BASE_URL)).toEqual([
      expect.objectContaining({ path: '/health/live', authorization: null }),
    ]);
    expect(probes.allRequests()).toHaveLength(2);
  });

  it('answers the 503 of the contract, a page of HTML or a status, as the test asks', async () => {
    const probes = createHealthProbesMock();
    probes.setMode(PATIENTS_BASE_URL, { ready503: 'not_configured' }, 'ready');
    probes.setMode(SUBSCRIPTIONS_API_BASE_URL, 'html200');

    const ready = await get(`${PATIENTS_BASE_URL}/health/ready`);
    expect(ready.status).toBe(503);
    expect(JSON.parse(ready.text)).toMatchObject({
      status: 'unavailable',
      checks: [{ name: 'database', error: 'not_configured' }],
    });
    expect((await get(`${PATIENTS_BASE_URL}/health/live`)).status).toBe(200);
    expect((await get(`${SUBSCRIPTIONS_API_BASE_URL}/health/live`)).text).toContain(
      '<!doctype html>',
    );

    probes.setMode(PATIENTS_BASE_URL, { status: 500 });
    expect((await get(`${PATIENTS_BASE_URL}/health/live`)).status).toBe(500);
  });

  it('fails as the network does when the service is down', async () => {
    const probes = createHealthProbesMock();
    probes.setMode(PATIENTS_BASE_URL, 'networkError');

    await expect(fetch(`${PATIENTS_BASE_URL}/health/live`)).rejects.toThrow();
  });

  it('holds the answers until the test lets them go', async () => {
    const probes = createHealthProbesMock();
    const release = probes.defer();
    let answered = false;
    const pending = fetch(`${PATIENTS_BASE_URL}/health/live`).then(() => {
      answered = true;
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(answered).toBe(false);
    release();
    await pending;
    expect(answered).toBe(true);
  });
});
