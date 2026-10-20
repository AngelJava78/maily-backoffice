import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { dashboardDto } from '@/test/factories';

import { dashboardSummarySchema, type DashboardSummary } from '../schemas/dashboardSummary';
import { DashboardIndicators } from './DashboardIndicators';

const { indicators, notAvailable } = messages.dashboard;

const phaseOne = dashboardSummarySchema.parse(dashboardDto());

function renderIndicators(changes: Partial<DashboardSummary> = {}) {
  return render(<DashboardIndicators summary={{ ...phaseOne, ...changes }} />);
}

/** Each label of the list of definitions with the value next to it, in their order. */
function shownIndicators(): [string | null, string | null | undefined][] {
  return screen
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent]);
}

describe('DashboardIndicators', () => {
  it('lists the six indicators in their order, each label with its value as Mexico writes it (FR-004)', () => {
    renderIndicators();

    expect(shownIndicators()).toEqual([
      [indicators.totalClinics, '12'],
      [indicators.activeClinics, '8'],
      [indicators.trialClinics, '3'],
      [indicators.totalDoctors, '37'],
      [indicators.totalPatients, '1,284'],
      [indicators.totalUsers, '52'],
    ]);
    for (const term of screen.getAllByRole('term')) {
      expect(term.nextElementSibling?.tagName).toBe('DD');
    }
  });

  it('shows a value that is not available as such, and 0 as 0, without touching the others (FR-007)', () => {
    renderIndicators({ totalDoctors: null, totalUsers: 0 });

    expect(shownIndicators()).toEqual([
      [indicators.totalClinics, '12'],
      [indicators.activeClinics, '8'],
      [indicators.trialClinics, '3'],
      [indicators.totalDoctors, notAvailable],
      [indicators.totalPatients, '1,284'],
      [indicators.totalUsers, '0'],
    ]);
  });

  it('never shows a value that is not available as 0', () => {
    renderIndicators({
      totalClinics: null,
      activeClinics: null,
      trialClinics: null,
      totalDoctors: null,
      totalPatients: null,
      totalUsers: null,
    });

    const values = shownIndicators().map(([, value]) => value);
    expect(values).toEqual(Array.from({ length: 6 }, () => notAvailable));
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('wraps a very large number instead of overflowing (edge case of the spec)', () => {
    renderIndicators({ totalPatients: 123_456_789_012 });

    const value = screen.getByText('123,456,789,012');
    expect(value.tagName).toBe('DD');
    expect(getComputedStyle(value).overflowWrap).toBe('anywhere');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderIndicators({ totalDoctors: null });

    expect(await axe(container)).toHaveNoViolations();
  });
});
