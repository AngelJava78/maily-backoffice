/**
 * Date and time of an ISO 8601 text as a person reads them: `15 oct 2026, 14:20`, or
 * `20 oct 2026, 10:07:32` with `seconds`. Dates travel in ISO 8601 and are only formatted here, in
 * the presentation layer (constitution IV). Without a `timeZone` it uses the zone of the browser,
 * which is the local one of the operator (FR-016). A text that is not a valid date is returned as
 * it came, so a bad value never breaks a screen.
 */
export function formatDateTime(
  iso: string,
  options: { readonly timeZone?: string; readonly seconds?: boolean } = {},
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: options.seconds === true ? 'medium' : 'short',
    timeZone: options.timeZone,
  }).format(date);
}
