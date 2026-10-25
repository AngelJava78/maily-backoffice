import { describe, expect, it } from 'vitest';

import { formatReturnLine } from './returnLine';

/** Friday 30 October 2026, 22:00 in Mexico City: before the database comes back. */
const now = Date.parse('2026-10-31T04:00:00Z');
const NEXT_START = '2026-11-02T14:00:00Z';

describe('formatReturnLine', () => {
  it('says when the database comes back, in the zone of the browser (FR-059)', () => {
    expect(formatReturnLine(NEXT_START, now, { timeZone: 'America/Mexico_City' })).toBe(
      'Vuelve a estar disponible el lunes 2 de noviembre a las 8:00',
    );
  });

  it('follows the daylight saving time of the zone (Auckland, already in summer)', () => {
    expect(formatReturnLine(NEXT_START, now, { timeZone: 'Pacific/Auckland' })).toBe(
      'Vuelve a estar disponible el martes 3 de noviembre a las 3:00',
    );
  });

  it.each([
    ['2026-11-02T01:30:00Z', 'a la 1:30'],
    ['2026-11-02T01:00:00Z', 'a la 1:00'],
    ['2026-11-02T00:15:00Z', 'a las 0:15'],
    ['2026-11-02T13:00:00Z', 'a las 13:00'],
    ['2026-11-02T10:05:00Z', 'a las 10:05'],
  ])('writes the hour of %s with «%s», on the 24-hour clock', (instant, hour) => {
    expect(formatReturnLine(instant, now, { timeZone: 'UTC' })).toBe(
      `Vuelve a estar disponible el lunes 2 de noviembre ${hour}`,
    );
  });

  it('says when it was programmed once that instant arrives or passes', () => {
    const programmed = 'Su encendido estaba programado para el lunes 2 de noviembre a las 8:00';

    expect(
      formatReturnLine(NEXT_START, Date.parse(NEXT_START), { timeZone: 'America/Mexico_City' }),
    ).toBe(programmed);
    expect(
      formatReturnLine(NEXT_START, Date.parse('2026-11-05T00:00:00Z'), {
        timeZone: 'America/Mexico_City',
      }),
    ).toBe(programmed);
  });

  it('never writes the time left, nor the comma of the long format', () => {
    const line = formatReturnLine(NEXT_START, now, { timeZone: 'America/Mexico_City' });

    expect(line).not.toMatch(/,|faltan|en \d|horas?\b|minutos?\b/);
  });

  it('uses the zone of the environment when none is given; the tests run in UTC', () => {
    expect(formatReturnLine(NEXT_START, now)).toBe(
      'Vuelve a estar disponible el lunes 2 de noviembre a las 14:00',
    );
  });
});
