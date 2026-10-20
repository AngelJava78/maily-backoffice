import { describe, expect, it } from 'vitest';

import { dashboardDto } from '@/test/factories';

import { dashboardSummarySchema } from '../schemas/dashboardSummary';
import { isRefreshDue, refreshIntervalFor } from './refreshRules';

const INTERVAL_MS = 300_000;

/** 10:02, when the person entered the Panel in the timeline of data-model.md. */
const ENTERED_AT = Date.parse('2026-10-20T10:02:00Z');

describe('isRefreshDue', () => {
  it('is due when there was never a successful refresh', () => {
    expect(isRefreshDue(0, 1_000, INTERVAL_MS)).toBe(true);
  });

  it('is not due before the interval since the last successful refresh, and is due once it passed (FR-019)', () => {
    expect(isRefreshDue(ENTERED_AT, ENTERED_AT + 3 * 60_000, INTERVAL_MS)).toBe(false);
    expect(isRefreshDue(ENTERED_AT, ENTERED_AT + 299_999, INTERVAL_MS)).toBe(false);
    expect(isRefreshDue(ENTERED_AT, ENTERED_AT + 300_000, INTERVAL_MS)).toBe(true);
    expect(isRefreshDue(ENTERED_AT, ENTERED_AT + 8 * 60_000, INTERVAL_MS)).toBe(true);
  });
});

describe('refreshIntervalFor', () => {
  it('stops the refresh once the service refused the permission (FR-015)', () => {
    expect(refreshIntervalFor({ kind: 'forbidden' }, INTERVAL_MS)).toBe(false);
  });

  it('keeps the interval with a summary, and before the first one arrives (FR-016)', () => {
    const summary = dashboardSummarySchema.parse(dashboardDto());

    expect(refreshIntervalFor({ kind: 'summary', summary }, INTERVAL_MS)).toBe(INTERVAL_MS);
    expect(refreshIntervalFor(undefined, INTERVAL_MS)).toBe(INTERVAL_MS);
  });
});
