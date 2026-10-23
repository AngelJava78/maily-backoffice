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

/** The annual saving of a plan over 12 monthly payments (research D5), all in whole cents. */
export interface AnnualSavings {
  /** Monthly price × 12 − annual price, always > 0. */
  readonly amountCents: number;
  /** `amountCents` over (monthly price × 12), rounded to the nearest whole number. */
  readonly percent: number;
  /** Annual price ÷ 12, rounded to the nearest cent. */
  readonly monthlyEquivalentCents: number;
}

/**
 * The saving an annual price represents over 12 monthly payments, or `null` when it is not a
 * saving (the annual price equals or is greater than 12 monthly payments, FR-005).
 */
export function computeAnnualSavings(
  monthlyPrice: string,
  annualPrice: string,
): AnnualSavings | null {
  const monthlyCents = toCents(monthlyPrice) * 12;
  const annualCents = toCents(annualPrice);
  const amountCents = monthlyCents - annualCents;
  if (!(amountCents > 0)) {
    return null;
  }
  return {
    amountCents,
    percent: Math.round((amountCents / monthlyCents) * 100),
    monthlyEquivalentCents: Math.round(annualCents / 12),
  };
}
