import { messages } from '@/shared/messages/es';

/** The value of the part of this type, or an empty text. */
function partOf(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

/**
 * When the database stopped by schedule comes back (FR-059, research D13): «Vuelve a estar
 * disponible el lunes 2 de noviembre a las 8:00» before `nextStartAt` and «Su encendido estaba
 * programado para el …» from that instant on, so the change comes with the clock alone. It never
 * writes the time left. The date is put together from its parts, so it goes without the comma of
 * the long format, and the hour is on the 24-hour clock, in the zone of the browser unless
 * `timeZone` says another.
 */
export function formatReturnLine(
  nextStartAt: string,
  now: number,
  options: { readonly timeZone?: string } = {},
): string {
  const { timeZone } = options;
  const instant = new Date(nextStartAt);
  const dateParts = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).formatToParts(instant);
  const timeParts = new Intl.DateTimeFormat('es', {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(instant);

  const date = `${partOf(dateParts, 'weekday')} ${partOf(dateParts, 'day')} de ${partOf(dateParts, 'month')}`;
  const time = `${partOf(timeParts, 'hour')}:${partOf(timeParts, 'minute')}`;
  const { returnLine } = messages.health;
  return instant.getTime() > now ? returnLine.future(date, time) : returnLine.past(date, time);
}
