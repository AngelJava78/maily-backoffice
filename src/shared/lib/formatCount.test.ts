import { describe, expect, it } from 'vitest';

import { formatCount } from './formatCount';

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [52, '52'],
    [1284, '1,284'],
    [12840, '12,840'],
    [1234567, '1,234,567'],
  ])('writes %d as Mexico writes it: %s', (count, text) => {
    expect(formatCount(count)).toBe(text);
  });

  it('never writes decimals', () => {
    expect(formatCount(1284.4)).toBe('1,284');
    expect(formatCount(0.6)).toBe('1');
  });
});
