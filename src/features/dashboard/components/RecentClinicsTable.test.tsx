import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { dashboardDto, recentClinicDto } from '@/test/factories';

import { dashboardSummarySchema, type RecentClinic } from '../schemas/dashboardSummary';
import { RecentClinicsTable } from './RecentClinicsTable';

const text = messages.dashboard.recentClinics;

const phaseOne = dashboardSummarySchema.parse(dashboardDto()).recentClinics ?? [];

function renderTable(clinics: readonly RecentClinic[] | null = phaseOne) {
  return render(<RecentClinicsTable clinics={clinics} />);
}

/** The cells of each row of the body of the table, as text. */
function shownRows(): string[][] {
  const [, ...rows] = within(screen.getByRole('table')).getAllByRole('row');
  return rows.map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  );
}

describe('RecentClinicsTable', () => {
  it('is a table named after its heading, with a header for each column', () => {
    renderTable();

    const table = screen.getByRole('table', { name: text.title });
    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([text.columns.name, text.columns.status, text.columns.createdAt]);
  });

  it('shows the clinics in the order received, with their status as it comes and their local date (FR-005)', () => {
    renderTable();

    expect(shownRows()).toEqual([
      ['Clínica Santa Aurora', 'En prueba', formatDateTime('2026-10-15T16:20:00Z')],
      ['Consultorio Del Valle', 'En prueba', formatDateTime('2026-10-12T09:05:00Z')],
      ['Centro Médico Horizonte', 'Activa', formatDateTime('2026-10-09T18:40:00Z')],
      ['Dental Sonríe', 'En prueba', formatDateTime('2026-10-08T15:00:00Z')],
      ['Clínica San Rafael', 'Activa', formatDateTime('2026-10-08T15:00:00Z')],
    ]);
    // The tests run in UTC, the zone of the browser here.
    expect(shownRows()[0]?.[2]).toContain('16:20');
  });

  it('offers no link and no action: the Panel is read only (FR-005, FR-010)', () => {
    renderTable();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says that there are no clinics when the list is empty, without a table (FR-008)', () => {
    renderTable([]);

    expect(screen.getByText(text.empty)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(messages.dashboard.notAvailable)).not.toBeInTheDocument();
  });

  it('says that the list is not available when it comes as null, which is not an empty list (FR-007)', () => {
    renderTable(null);

    expect(screen.getByText(messages.dashboard.notAvailable)).toBeInTheDocument();
    expect(screen.queryByText(text.empty)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('wraps a long name instead of overflowing', () => {
    // A single word of 200 characters: nowhere to break it but inside.
    const name = 'Clínica'.repeat(30).slice(0, 200);
    renderTable(
      dashboardSummarySchema.parse(dashboardDto({ recent_clinics: [recentClinicDto({ name })] }))
        .recentClinics,
    );

    expect(getComputedStyle(screen.getByRole('cell', { name })).overflowWrap).toBe('anywhere');
  });

  it.each([
    ['with clinics', phaseOne],
    ['without clinics', []],
    ['with the list not available', null],
  ])('has no accessibility violations %s', async (_label, clinics) => {
    const { container } = renderTable(clinics);

    expect(await axe(container)).toHaveNoViolations();
  });
});
