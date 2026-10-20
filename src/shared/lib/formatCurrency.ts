/** A decimal number written with digits and an optional point, as the APIs send amounts. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;

// Created once: building a formatter is expensive and the format never changes.
const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/**
 * An amount as a person in Mexico reads it, in Mexican pesos: `$4,500.00`, always with two decimals
 * and the thousands separator (FR-014). The amount travels as text and is only formatted here, in
 * the presentation layer (constitution IV). A text that is not a number is returned as it came, so
 * a bad value never breaks a screen.
 */
export function formatMxn(amount: string): string {
  return DECIMAL_TEXT.test(amount) ? MXN.format(Number(amount)) : amount;
}
