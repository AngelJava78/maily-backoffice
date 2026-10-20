import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '../../subscriptionsClient';
import { ADMIN_SUB, createUsersDirectoryMock } from '../usersDirectory';
import { createPlatformDashboardMock, phaseOneDashboard } from '.';

const PATH = '/api/v1/dashboard';

describe('the simulator of the summary of the Panel', () => {
  it('answers 200 with the data of phase 1, without letting it be cached', async () => {
    createPlatformDashboardMock();

    const answer = await callSubscriptions(PATH);

    expect(answer.status).toBe(200);
    expect(answer.headers.get('cache-control')).toBe('no-store');
    expect(answer.body).toEqual(phaseOneDashboard());
  });

  it('answers 401 to a request without a token', async () => {
    createPlatformDashboardMock();

    const answer = await callSubscriptions(PATH, { sub: null });

    expect(answer.status).toBe(401);
    expect(answer.body).toMatchObject({ code: 'unauthenticated' });
  });

  it('asks the users service for dashboard:read: 403 without it, 200 once it is granted', async () => {
    const directory = createUsersDirectoryMock();
    createPlatformDashboardMock({ directory });

    const refused = await callSubscriptions(PATH, { sub: ADMIN_SUB });
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'permission_denied' });

    directory.grant('Administrator', 'dashboard:read');

    expect((await callSubscriptions(PATH, { sub: ADMIN_SUB })).status).toBe(200);
  });

  it('answers 503 while the users API does not answer, and 200 again once it recovers', async () => {
    const platform = createPlatformDashboardMock();
    platform.authorizationUnavailable();

    const down = await callSubscriptions(PATH);
    expect(down.status).toBe(503);
    expect(down.body).toMatchObject({ code: 'authorization_unavailable' });

    platform.recover();

    expect((await callSubscriptions(PATH)).status).toBe(200);
  });

  it('sends null only for the data whose source failed', async () => {
    const platform = createPlatformDashboardMock();
    platform.setUnavailable('total_doctors');

    expect((await callSubscriptions(PATH)).body).toEqual({
      ...phaseOneDashboard(),
      total_doctors: null,
    });
  });

  it('sends the list of recent clinics it is given, and the counts it is given', async () => {
    const platform = createPlatformDashboardMock();
    platform.setRecentClinics([]);
    platform.setSummary({ total_users: 0 });

    expect((await callSubscriptions(PATH)).body).toEqual({
      ...phaseOneDashboard(),
      recent_clinics: [],
      total_users: 0,
    });
  });

  it('keeps every request it receives, with its query string', async () => {
    const platform = createPlatformDashboardMock();

    await callSubscriptions(PATH);
    await callSubscriptions(`${PATH}?limit=3`);

    expect(platform.requestsTo('GET', PATH).map((request) => request.search)).toEqual([
      '',
      '?limit=3',
    ]);
    expect(platform.requestCount).toBe(2);
  });
});
