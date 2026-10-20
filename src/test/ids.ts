const UUID_OF_NUMBER = /^00000000-0000-4000-8000-(\d{12})$/;

/**
 * A well formed UUID v4 that always is the same for the same number, so a test can name its users
 * by number (`uuidOf(7)`) and still send what the users service sends: the id of a user is a UUID.
 */
export function uuidOf(number: number): string {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

/** The number a UUID was made from with `uuidOf`, or `null` when it was made some other way. */
export function numberOf(id: string): number | null {
  const match = UUID_OF_NUMBER.exec(id);
  return match?.[1] === undefined ? null : Number(match[1]);
}
