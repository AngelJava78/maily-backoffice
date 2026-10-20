import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { LastUpdated } from './LastUpdated';

const UPDATED_AT = Date.parse('2026-10-20T10:07:32Z');

/** Whether the element is inside a region that screen readers announce when it changes. */
function isInLiveRegion(element: HTMLElement): boolean {
  return element.closest('[role="status"], [role="alert"], [aria-live]') !== null;
}

const lastUpdatedLine = () =>
  screen.getByText((content) => content.startsWith(messages.dashboard.lastUpdated('')));

describe('LastUpdated', () => {
  it('says when the data was last updated, always with the date and with the seconds (FR-009)', () => {
    render(<LastUpdated updatedAt={UPDATED_AT} isUpdating={false} />);

    const line = lastUpdatedLine();
    expect(line).toHaveTextContent('20');
    expect(line).toHaveTextContent('oct');
    expect(line).toHaveTextContent('2026');
    expect(line).toHaveTextContent('10:07:32');
  });

  it('is plain text, never announced when it changes (FR-033)', async () => {
    const { container } = render(<LastUpdated updatedAt={UPDATED_AT} isUpdating={false} />);

    expect(isInLiveRegion(lastUpdatedLine())).toBe(false);
    expect(screen.queryByText(messages.dashboard.updating)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says that the data is being updated next to the time, without announcing it (FR-009, FR-033)', async () => {
    const { container } = render(<LastUpdated updatedAt={UPDATED_AT} isUpdating />);

    const signal = screen.getByText(messages.dashboard.updating);
    expect(isInLiveRegion(signal)).toBe(false);
    expect(isInLiveRegion(lastUpdatedLine())).toBe(false);
    // The graphic indicator is only decoration: screen readers do not see it.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
