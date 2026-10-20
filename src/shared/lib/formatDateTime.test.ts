import { describe, expect, it } from 'vitest';

import { formatDateTime } from './formatDateTime';

/** The creation date of the user 121, as the users service sends it (ISO 8601, UTC). */
const ISO = '2026-10-15T14:20:11.032Z';

describe('formatDateTime', () => {
  it('shows the date and the time in Spanish', () => {
    const text = formatDateTime(ISO, { timeZone: 'UTC' });

    expect(text).toContain('15');
    expect(text).toContain('oct');
    expect(text).toContain('2026');
    expect(text).toContain('14:20');
  });

  it('converts the time to the zone it is asked for', () => {
    // The hour of the 24-hour clock has no leading zero in this locale: `8:20`, not `08:20`.
    expect(formatDateTime(ISO, { timeZone: 'America/Mexico_City' })).toMatch(/\b0?8:20\b/);
    expect(formatDateTime(ISO, { timeZone: 'Asia/Tokyo' })).toContain('23:20');
  });

  it('uses the zone of the environment when none is given (FR-016); the tests run in UTC', () => {
    expect(formatDateTime(ISO)).toContain('14:20');
  });

  it('returns the text as it came when it is not a valid date, without throwing', () => {
    expect(formatDateTime('no-es-fecha')).toBe('no-es-fecha');
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('no-es-fecha', { seconds: true })).toBe('no-es-fecha');
  });

  // The last refresh of the Panel (feature 007, FR-009): the seconds show that it changed even
  // within the same minute.
  it('adds the seconds when they are asked for, keeping the date', () => {
    const text = formatDateTime('2026-10-20T10:07:32Z', { seconds: true, timeZone: 'UTC' });

    expect(text).toContain('20');
    expect(text).toContain('oct');
    expect(text).toContain('2026');
    expect(text).toContain('10:07:32');
  });

  it('leaves the seconds out unless they are asked for', () => {
    const text = formatDateTime('2026-10-20T10:07:32Z', { timeZone: 'UTC' });

    expect(text).toContain('10:07');
    expect(text).not.toContain(':32');
  });
});
