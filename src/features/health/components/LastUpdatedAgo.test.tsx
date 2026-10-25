import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import { LastUpdatedAgo } from './LastUpdatedAgo';

const text = messages.health.page;
const NOW = Date.parse('2026-10-30T10:00:13Z');

afterEach(() => {
  vi.useRealTimers();
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** The line that says how long ago the data arrived. */
function elapsedLine(): HTMLElement {
  return screen.getByText((content) => content.startsWith('Actualizado'));
}

describe('LastUpdatedAgo', () => {
  it('moves every second, then goes to minutes and then to the date (FR-027)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const updatedAt = NOW - 12_000;
    render(<LastUpdatedAgo updatedAt={updatedAt} isUpdating={false} />);

    expect(elapsedLine()).toHaveTextContent('Actualizado hace 12 s');
    await advance(1_000);
    expect(elapsedLine()).toHaveTextContent('Actualizado hace 13 s');

    await advance(47_000);
    expect(elapsedLine()).toHaveTextContent('Actualizado hace 1 min');

    await advance(59 * 60_000);
    expect(elapsedLine()).toHaveTextContent(
      text.updatedAt(formatDateTime(new Date(updatedAt).toISOString(), { seconds: true })),
    );
  });

  it('is never announced: it is in no live region (FR-063)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    render(<LastUpdatedAgo updatedAt={NOW} isUpdating />);

    for (const element of [elapsedLine(), screen.getByText(text.updating)]) {
      expect(element.closest('[role="status"], [role="alert"], [aria-live]')).toBeNull();
    }
  });

  it('says it is updating while the aggregator is asked, with a sign that only decorates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const { container, rerender } = render(<LastUpdatedAgo updatedAt={NOW} isUpdating />);

    expect(screen.getByText(text.updating)).toBeVisible();
    expect(container.querySelector('.MuiCircularProgress-root')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    rerender(<LastUpdatedAgo updatedAt={NOW} isUpdating={false} />);

    expect(screen.queryByText(text.updating)).not.toBeInTheDocument();
  });
});
