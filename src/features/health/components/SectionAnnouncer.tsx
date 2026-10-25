import { useState } from 'react';

import { LiveStatus } from '@/shared/ui/LiveStatus';

/** A character that is not read, to tell a screen reader that the same text is new again. */
const AGAIN = '​';

/**
 * Announces a section of the fallback, politely, in a live region of its own that exists since the
 * section appeared (FR-063, FR-075): when its step ends for the first time, and again each time the
 * person asks (a new `announceToken`). The automatic cycles and the clock never write into it, so
 * a refresh does not interrupt a screen reader.
 */
export function SectionAnnouncer({
  settled,
  text,
  announceToken,
}: {
  /** The step ended: there is something to say. */
  readonly settled: boolean;
  /** What is said: the text of the section. */
  readonly text: string;
  readonly announceToken: number;
}) {
  const [announced, setAnnounced] = useState<{ readonly token: number; readonly text: string }>();

  // Derived from the props while rendering, never in an effect: once per token.
  if (settled && announced?.token !== announceToken) {
    setAnnounced({
      token: announceToken,
      // The same text again would not be read: it changes by a character that is not read.
      text: announced?.text === text ? `${text}${AGAIN}` : text,
    });
  }

  return <LiveStatus>{announced?.text ?? ''}</LiveStatus>;
}
