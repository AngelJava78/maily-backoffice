import { describe, expect, it } from 'vitest';

import { ApiError, SessionExpiredError } from '@/shared/api/ApiError';
import { formatDateTime } from '@/shared/lib/formatDateTime';

import { formatElapsed, isRefreshDue, startsFallbackChain } from './refreshRules';

const INTERVAL_MS = 30_000;
/** The last correct answer of the timeline of user story 2: 10:00:01. */
const LAST = Date.parse('2026-10-30T10:00:01Z');
const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;

describe('isRefreshDue', () => {
  it('is due when there never was a correct answer', () => {
    expect(isRefreshDue(0, LAST, INTERVAL_MS)).toBe(true);
  });

  it('is due once the interval passed since the last correct answer (FR-023)', () => {
    expect(isRefreshDue(LAST, LAST + INTERVAL_MS, INTERVAL_MS)).toBe(true);
    expect(isRefreshDue(LAST, LAST + 2 * MINUTE_MS, INTERVAL_MS)).toBe(true);
  });

  it('is not due before the interval passed', () => {
    expect(isRefreshDue(LAST, LAST, INTERVAL_MS)).toBe(false);
    expect(isRefreshDue(LAST, LAST + 19 * SECOND_MS, INTERVAL_MS)).toBe(false);
    expect(isRefreshDue(LAST, LAST + INTERVAL_MS - 1, INTERVAL_MS)).toBe(false);
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, 'Actualizado hace 0 s'],
    [12 * SECOND_MS, 'Actualizado hace 12 s'],
    [59 * SECOND_MS, 'Actualizado hace 59 s'],
    [59_999, 'Actualizado hace 59 s'],
    [MINUTE_MS, 'Actualizado hace 1 min 0 s'],
    [MINUTE_MS + 15 * SECOND_MS, 'Actualizado hace 1 min 15 s'],
    [59 * MINUTE_MS + 59 * SECOND_MS, 'Actualizado hace 59 min 59 s'],
  ])('says %d ms ago as «%s» (FR-027)', (elapsed, text) => {
    expect(formatElapsed(LAST, LAST + elapsed)).toBe(text);
  });

  it('gives the date and the time, with the seconds, from an hour on', () => {
    expect(formatElapsed(LAST, LAST + 60 * MINUTE_MS)).toBe(
      `Actualizado: ${formatDateTime(new Date(LAST).toISOString(), { seconds: true })}`,
    );
  });

  it('never says a negative time: a clock out of step counts as 0 s', () => {
    expect(formatElapsed(LAST, LAST - 5 * SECOND_MS)).toBe('Actualizado hace 0 s');
  });
});

describe('startsFallbackChain', () => {
  it.each([
    ['a network failure', ApiError.network()],
    ['a time-out', ApiError.timeout()],
    ['a broken contract', ApiError.contract(200, 'bad shape')],
    ['a 500', ApiError.fromResponse(500, undefined)],
    ['a 502', ApiError.fromResponse(502, undefined)],
    ['a 503', ApiError.fromResponse(503, undefined)],
  ])('starts the chain after %s (FR-067)', (_label, error) => {
    expect(startsFallbackChain(error)).toBe(true);
  });

  it.each([
    ['a 401', ApiError.fromResponse(401, undefined)],
    ['a 403', ApiError.fromResponse(403, undefined)],
    ['a 404', ApiError.fromResponse(404, undefined)],
    ['a 422', ApiError.fromResponse(422, undefined)],
    ['the end of the session', new SessionExpiredError()],
    ['any other error', new Error('boom')],
  ])('does not start it after %s (research D8)', (_label, error) => {
    expect(startsFallbackChain(error)).toBe(false);
  });
});
