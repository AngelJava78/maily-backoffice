import { focusManager } from '@tanstack/react-query';
import { act, configure, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { watchFetchCalls } from '@/test/fetchCalls';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createHealthProbesMock } from '@/test/handlers/healthProbes';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { ADMIN_ID } from '@/test/handlers/usersDirectory/seed';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/health'),
    import('@/features/health/components/AccessCheckFallback'),
    import('@/features/home'),
  ]);
}, 90_000);

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

const text = messages.health.platform;
const PUBLIC_STATUS_PATH = '/health/status';
const NEXT_START = '2026-11-02T14:00:00Z';
const MINUTE_MS = 60_000;
/** The check of the access and its two retries, 1 and 2 seconds apart (constitution IV). */
const ACCESS_RETRIES_MS = 3_000;

/** The users service cannot answer the access, and the health simulator answers its status. */
function start() {
  const directory = createUsersDirectoryMock();
  directory.failAll(503);
  const health = createHealthMonitoringMock({ registered: [monitoredComponentDto()] });
  return {
    directory,
    health,
    asked: () => health.requestsTo('GET', PUBLIC_STATUS_PATH).length,
  };
}

function open() {
  return renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const failureHeading = () =>
  screen.findByRole('heading', { level: 1, name: messages.checkFailed.title });

describe(
  '«No se pudo comprobar el acceso» shows the status of the platform (user story 5)',
  {
    timeout: 30_000,
  },
  () => {
    it('keeps the screen and shows the database stopped by schedule and when it comes back (US5-1)', async () => {
      // Friday night in UTC, the zone of the tests: only the clock is fixed, the timers stay real.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.parse('2026-10-31T04:00:00Z'));
      const { health } = start();
      health.setComponentStatus('database', 'stopped', { next_start_at: NEXT_START });
      open();

      expect(await failureHeading()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: messages.common.logout })).toBeInTheDocument();
      expect(await screen.findByText(text.databaseStopped)).toBeInTheDocument();
      expect(screen.getByText('Degradado')).toBeInTheDocument();
      expect(screen.getByText('MailySoft Usuarios')).toBeInTheDocument();
      expect(
        screen.getByText('Vuelve a estar disponible el lunes 2 de noviembre a las 14:00'),
      ).toBeInTheDocument();
    });

    it('shows a service that is down without a notice of the schedule (US5-2)', async () => {
      const { health } = start();
      health.setComponentStatus('mailysoft-usuarios', 'down', { error: 'connection_error' });
      open();

      expect(await screen.findByText('Con componentes caídos')).toBeInTheDocument();
      expect(screen.queryByText(text.databaseStopped)).not.toBeInTheDocument();
    });

    it('says it could not get the status when the public status fails too (US5-3)', async () => {
      const { health } = start();
      health.publicStatus.failAll(500);
      // Then the browser checks the services by itself (user story 6).
      createHealthProbesMock();
      open();

      expect(await screen.findByText(text.failed)).toBeInTheDocument();
      expect(await failureHeading()).toBeInTheDocument();
    });

    it('asks without the token and without cookies (FR-056)', async () => {
      const { health } = start();
      const calls = watchFetchCalls();
      open();

      await screen.findByText('Todo operativo');

      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)[0]?.authorization).toBeNull();
      const publicCalls = calls().filter((call) => call.url.endsWith(PUBLIC_STATUS_PATH));
      expect(publicCalls.map((call) => call.credentials)).toEqual(['omit']);
    });

    it('asks once when it appears, once more after a «Reintentar» that fails, and never on its own (SC-015)', async () => {
      const { asked } = start();
      vi.useFakeTimers();
      const { user } = open();
      await advance(ACCESS_RETRIES_MS);
      await failureHeading();
      await waitFor(() => {
        expect(asked()).toBe(1);
      });

      await user.click(screen.getByRole('button', { name: messages.common.retry }));
      // While the access is checked again (with its retries), the chain waits.
      await advance(ACCESS_RETRIES_MS - 500);
      expect(asked()).toBe(1);
      await advance(1_000);
      await waitFor(() => {
        expect(asked()).toBe(2);
      });

      // Ten minutes open, with the checks of every 5 minutes and coming back to the tab.
      await advance(10 * MINUTE_MS);
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });
      await advance(ACCESS_RETRIES_MS + 1_000);
      expect(asked()).toBe(2);
    });

    it('lets the person in, without waiting for the status, when «Reintentar» gives the access', async () => {
      const { directory, health } = start();
      const { user } = open();
      await failureHeading();
      await screen.findByText('Todo operativo');
      health.publicStatus.defer();
      directory.recover();

      await user.click(screen.getByRole('button', { name: messages.common.retry }));

      expect(
        await screen.findByRole('heading', { level: 1, name: messages.home.title }),
      ).toBeInTheDocument();
    });

    it('is not part of «Sin acceso», which asks nothing of the platform (FR-055)', async () => {
      const base = defaultDirectory();
      createUsersDirectoryMock({ ...base, associations: [{ userId: ADMIN_ID, roleId: 3 }] });
      const health = createHealthMonitoringMock();
      const { router } = open();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/access-denied');
      });
      expect(screen.queryByRole('heading', { level: 2, name: text.title })).not.toBeInTheDocument();
      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toHaveLength(0);
    });
  },
);
