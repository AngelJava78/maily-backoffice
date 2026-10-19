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
  });
});
