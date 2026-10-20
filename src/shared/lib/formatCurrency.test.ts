import { describe, expect, it } from 'vitest';

import { formatMxn } from './formatCurrency';

describe('formatMxn', () => {
  it.each([
    ['4500.00', '$4,500.00'],
    ['0.00', '$0.00'],
    ['1999.5', '$1,999.50'],
    ['99999999.99', '$99,999,999.99'],
    ['150', '$150.00'],
  ])('formats %s as Mexican pesos, as Mexico writes them: %s', (amount, text) => {
    expect(formatMxn(amount)).toBe(text);
  });

  it('always has two decimals and the thousands separator', () => {
    expect(formatMxn('1234567')).toBe('$1,234,567.00');
  });

  it.each(['abc', '', '   ', '4,500', '$4500', '1e3'])(
    'returns a text that is not a number as it came, without throwing (%j)',
    (text) => {
      expect(formatMxn(text)).toBe(text);
    },
  );
});
