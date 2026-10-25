import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { PlatformStatusView } from '../hooks/usePlatformStatusSection';
import { formatReturnLine } from '../policy/returnLine';
import { publicStatusSchema, type PlatformStatus } from '../schemas/publicStatus';
import { PlatformStatusSection } from './PlatformStatusSection';

const text = messages.health.platform;
const NEXT_START = '2026-11-02T14:00:00Z';
const NIGHT = Date.parse('2026-10-31T04:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

/** The public status of the example of P1, with the database in these terms. */
function platformWith(
  database: { status?: string; next_start_at?: string | null } = {},
): PlatformStatus {
  return publicStatusSchema.parse({
    status: 'degraded',
    checked_at: '2026-10-31T04:00:03Z',
    components: [
      {
        code: 'maily-system-api',
        name: 'MailySoft System API',
        kind: 'service',
        status: 'degraded',
        next_start_at: null,
      },
      {
        code: 'database',
        name: 'Base de datos',
        kind: 'database',
        status: 'stopped',
        next_start_at: NEXT_START,
        ...database,
      },
      {
        code: 'mailysoft-usuarios',
        name: 'MailySoft Usuarios',
        kind: 'service',
        status: 'down',
        next_start_at: null,
      },
    ],
  });
}

const ready = (platform: PlatformStatus, isRefreshing = false): PlatformStatusView => ({
  status: 'ready',
  platform,
  isRefreshing,
});

function renderSection(view: PlatformStatusView, announceToken = 0) {
  return render(<PlatformStatusSection view={view} announceToken={announceToken} />);
}

const liveRegion = () => screen.getByRole('status');

describe('PlatformStatusSection', () => {
  it('shows nothing while its step does not exist', () => {
    const { container } = renderSection({ status: 'hidden' });

    expect(container).toBeEmptyDOMElement();
  });

  it('says it is asking, under its heading, without announcing anything yet', async () => {
    const { container } = renderSection({ status: 'loading' });

    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
    expect(screen.getByText(text.loading)).toBeInTheDocument();
    expect(liveRegion()).toBeEmptyDOMElement();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the overall status and each component with its status, in the order received (FR-058)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NIGHT);
    const { container } = renderSection(ready(platformWith()));

    // The overall status, and the status of maily-system-api.
    expect(screen.getAllByText('Degradado')).toHaveLength(2);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'MailySoft System APIDegradado',
      'Base de datosDetenida por horario',
      'MailySoft UsuariosCaído',
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says the database is stopped by schedule and when it comes back (FR-059)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NIGHT);
    const { container } = renderSection(ready(platformWith()));

    expect(screen.getByText(text.databaseStopped)).toBeInTheDocument();
    // In the section, not in its live region, which says it too.
    expect(
      screen.getByText(formatReturnLine(NEXT_START, NIGHT), { selector: 'p' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says the database is stopped without a return line when there is no next start', async () => {
    const { container } = renderSection(ready(platformWith({ next_start_at: null })));

    expect(screen.getByText(text.databaseStopped)).toBeInTheDocument();
    expect(screen.queryByText(/Vuelve a estar disponible|Su encendido/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says nothing of the schedule when the database is up', () => {
    renderSection(ready(platformWith({ status: 'up', next_start_at: null })));

    expect(screen.queryByText(text.databaseStopped)).not.toBeInTheDocument();
  });

  it('changes the line by itself when the time of the next start arrives', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse(NEXT_START) - 1_000);
    renderSection(ready(platformWith()));
    expect(screen.getByText(/Vuelve a estar disponible/, { selector: 'p' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(
      screen.getByText(/Su encendido estaba programado/, { selector: 'p' }),
    ).toBeInTheDocument();
  });

  it('says there are no components when the list is empty', async () => {
    const { container } = renderSection({ status: 'empty', isRefreshing: false });

    expect(screen.getByText(text.empty)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it could not get the status when its query failed (FR-060)', async () => {
    const { container } = renderSection({ status: 'failed' });

    expect(screen.getByText(text.failed)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is updating while it asks again with data on screen', () => {
    renderSection(ready(platformWith(), true));

    expect(screen.getByText(text.refreshing)).toBeInTheDocument();
  });

  it('never shows versions, latencies, checks nor errors (FR-058)', () => {
    const { container } = renderSection(ready(platformWith()));

    expect(container).not.toHaveTextContent(/Versión|Latencia|ms\b|Chequeos|Commit/);
  });

  describe('its announcements (FR-063)', () => {
    it('announces the section once when its step ends for the first time', () => {
      const { rerender } = renderSection({ status: 'loading' });
      expect(liveRegion()).toBeEmptyDOMElement();

      rerender(<PlatformStatusSection view={{ status: 'failed' }} announceToken={0} />);

      expect(liveRegion()).toHaveTextContent(`${text.title}. ${text.failed}`);
    });

    it('does not announce a refresh that the person did not ask for', () => {
      const { rerender } = renderSection({ status: 'failed' });
      const first = liveRegion().textContent;

      rerender(<PlatformStatusSection view={ready(platformWith())} announceToken={0} />);

      expect(liveRegion().textContent).toBe(first);
    });

    it('announces it again when the person asks again, even with the same text', () => {
      const { rerender } = renderSection({ status: 'failed' });
      const first = liveRegion().textContent;

      rerender(<PlatformStatusSection view={{ status: 'loading' }} announceToken={1} />);
      rerender(<PlatformStatusSection view={{ status: 'failed' }} announceToken={1} />);

      expect(liveRegion().textContent).not.toBe(first);
      expect(liveRegion()).toHaveTextContent(`${text.title}. ${text.failed}`);
    });
  });
});
