// Created once: building a formatter is expensive and the format never changes.
const COUNT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/**
 * A count as a person in Mexico reads it: `1,284` and `12,840`, with the comma between thousands
 * from four digits on and without decimals, as the clarification of the spec of feature 007 asks
 * (the convention of Mexico). Counts are only formatted here, in the presentation layer
 * (constitution IV).
 */
export function formatCount(count: number): string {
  return COUNT.format(count);
}
