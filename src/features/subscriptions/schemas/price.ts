/**
 * The monthly price as the operator writes it (clarification 8): only digits and an optional
 * decimal point with up to two decimals, from 0 to 99,999,999.99. Commas, "$" and any other
 * character are an error, so what is saved is exactly what was written.
 */
export const PRICE_INPUT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

/** The monthly price as the API sends it: Mexican pesos, always with two decimals ("4500.00"). */
export const READ_PRICE_PATTERN = /^\d{1,8}\.\d{2}$/;

/** The whole pesos and the decimals of a price, read apart so no floating point is involved. */
const PRICE_PARTS = /^(\d{1,8})(?:\.(\d{1,2}))?$/;

/**
 * A price in cents, to compare and to sort prices exactly: "4500" and "4500.00" are the same
 * price, and "0.29" is 29 (with floating point, 0.29 × 100 is 28.999…). Spaces around the text
 * do not count. A text that is not a price gives `NaN`.
 */
export function toCents(text: string): number {
  const parts = PRICE_PARTS.exec(text.trim());
  if (parts === null) {
    return Number.NaN;
  }
  const [, pesos = '', decimals = ''] = parts;
  return Number(pesos) * 100 + Number(decimals.padEnd(2, '0'));
}
