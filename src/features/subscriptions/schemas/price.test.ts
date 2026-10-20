import { describe, expect, it } from 'vitest';

import { PRICE_INPUT_PATTERN, READ_PRICE_PATTERN, toCents } from './price';

describe('PRICE_INPUT_PATTERN', () => {
  it.each(['0', '4500', '4500.5', '4500.50', '99999999.99', '00000001'])(
    'accepts %j: digits and an optional decimal point with up to two decimals',
    (text) => {
      expect(PRICE_INPUT_PATTERN.test(text)).toBe(true);
    },
  );

  it.each(['', '-1', '4,500', '$4500', '12.345', '100000000', '1e3', '4500.', '.5', ' 4500'])(
    'rejects %j',
    (text) => {
      expect(PRICE_INPUT_PATTERN.test(text)).toBe(false);
    },
  );
});

describe('READ_PRICE_PATTERN', () => {
  it('accepts the price as the API sends it, always with two decimals', () => {
    expect(READ_PRICE_PATTERN.test('4500.00')).toBe(true);
    expect(READ_PRICE_PATTERN.test('0.00')).toBe(true);
    expect(READ_PRICE_PATTERN.test('99999999.99')).toBe(true);
  });

  it.each(['4500', '4500.5', '4500.000', '-1.00', '4,500.00'])('rejects %j', (text) => {
    expect(READ_PRICE_PATTERN.test(text)).toBe(false);
  });
});

describe('toCents', () => {
  it.each([
    ['4500.00', 450_000],
    ['4500', 450_000],
    ['4500.5', 450_050],
    ['0', 0],
    ['0.00', 0],
    ['99999999.99', 9_999_999_999],
    ['0.29', 29],
    ['0.07', 7],
    [' 4500.5 ', 450_050],
  ])('gives %j as %i cents, without floating point arithmetic', (text, cents) => {
    expect(toCents(text)).toBe(cents);
  });

  it('gives NaN for a text that is not a price', () => {
    expect(toCents('abc')).toBeNaN();
    expect(toCents('4,500')).toBeNaN();
  });
});
