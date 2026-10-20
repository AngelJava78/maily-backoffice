import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { dashboardDto } from '@/test/factories';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { server } from '@/test/server';
import { createSubscriptionsClient, subscriptionsUrl } from '@/test/subscriptionsClient';

import { getDashboard } from './dashboardApi';

const PATH = '/api/v1/dashboard';

describe('getDashboard', () => {
  it('asks for the summary with the token and without a limit, and gives it in camelCase (FR-006)', async () => {
    const platform = createPlatformDashboardMock();
    const { client, authorization } = createSubscriptionsClient();

    const summary = await getDashboard(client);

    expect(platform.requestsTo('GET', PATH)).toEqual([
      expect.objectContaining({ search: '', authorization }),
    ]);
    expect(authorization).toBe('Bearer test-token:auth0|admin');
    expect(summary).toMatchObject({
      totalClinics: 12,
      activeClinics: 8,
      trialClinics: 3,
      totalDoctors: 37,
      totalPatients: 1284,
      totalUsers: 52,
    });
    expect(summary.recentClinics).toHaveLength(5);
    expect(summary.recentClinics?.[0]).toEqual({
      id: '5457da22-336d-49d8-8876-4d7edb5586ae',
      name: 'Clínica Santa Aurora',
      createdAt: '2026-10-15T16:20:00Z',
      status: { id: 2, name: 'En prueba' },
    });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    const withoutClinics = Object.fromEntries(
      Object.entries(dashboardDto()).filter(([key]) => key !== 'recent_clinics'),
    );
    server.use(http.get(subscriptionsUrl(PATH), () => HttpResponse.json(withoutClinics)));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getDashboard(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('passes a 403 on as it comes: the Panel decides what it means (research D6)', async () => {
    createPlatformDashboardMock({ directory: createUsersDirectoryMock() });
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getDashboard(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, code: 'permission_denied' });
  });

  it('can be cancelled with the signal it receives, which the service sees as aborted', async () => {
    const platform = createPlatformDashboardMock();
    platform.defer();
    const { client } = createSubscriptionsClient();
    const controller = new AbortController();
    const assertion = expect(
      getDashboard(client, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => {
      expect(platform.requestCount).toBe(1);
    });

    controller.abort();

    await assertion;
    await vi.waitFor(() => {
      expect(platform.requests[0]?.aborted).toBe(true);
    });
  });
});
