import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  healthComponentDto,
  healthResultDto,
  type HealthComponentDto,
  type HealthResultDto,
} from '@/test/factories';

import { formatReturnLine } from '../policy/returnLine';
import { healthResultSchema } from '../schemas/healthResult';
import { HealthNotices } from './HealthNotices';

const { notices } = messages.health;
const NOW = Date.parse('2026-10-31T04:00:00Z');
const NEXT_START = '2026-11-02T14:00:00Z';

beforeEach(() => {
  // Only the clock is fixed: the timers stay real, so axe can run.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/** The result with the database in these terms, and these other changes. */
function resultWith(
  database: Partial<HealthComponentDto>,
  overrides: Partial<HealthResultDto> = {},
) {
  const [api, base] = healthResultDto().components;
  return healthResultSchema.parse(
    healthResultDto({
      components: [healthComponentDto(api), healthComponentDto({ ...base, ...database })],
      ...overrides,
    }),
  );
}

describe('HealthNotices', () => {
  it('explains the database stopped by schedule, and when it comes back (FR-017, FR-059)', () => {
    render(<HealthNotices result={resultWith({ status: 'stopped', next_start_at: NEXT_START })} />);

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(notices.databaseStopped);
    expect(note).toHaveTextContent(formatReturnLine(NEXT_START, NOW));
  });

  it('explains the database stopped by schedule without a return line when it has no next start', () => {
    render(<HealthNotices result={resultWith({ status: 'stopped', next_start_at: null })} />);

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(notices.databaseStopped);
    expect(note).not.toHaveTextContent(/Vuelve a estar disponible|Su encendido/);
  });

  it('explains the database that does not answer', () => {
    render(<HealthNotices result={resultWith({ status: 'down', error: 'timeout' })} />);

    expect(screen.getByRole('note')).toHaveTextContent(notices.databaseDown);
  });

  it('says nothing while the database is up and the registry was read', () => {
    const { container } = render(<HealthNotices result={resultWith({})} />);

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('warns that the list may be incomplete when the registry could not be read (FR-018)', () => {
    render(<HealthNotices result={resultWith({}, { registry_available: false })} />);

    expect(screen.getByRole('note')).toHaveTextContent(notices.registryUnavailable);
  });

  it('never interrupts: none of its notices is an alert (FR-049)', () => {
    render(
      <HealthNotices
        result={resultWith(
          { status: 'stopped', next_start_at: NEXT_START },
          { registry_available: false },
        )}
      />,
    );

    expect(screen.getAllByRole('note')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores a next start in a component other than the database', () => {
    const result = healthResultSchema.parse(
      healthResultDto({
        components: [
          healthComponentDto({ status: 'down', next_start_at: NEXT_START }),
          healthComponentDto({ code: 'database', name: 'Base de datos', kind: 'database' }),
        ],
      }),
    );

    const { container } = render(<HealthNotices result={result} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <HealthNotices
        result={resultWith(
          { status: 'stopped', next_start_at: NEXT_START },
          { registry_available: false },
        )}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
