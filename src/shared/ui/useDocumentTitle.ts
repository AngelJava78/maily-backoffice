import { useEffect } from 'react';

import { messages } from '@/shared/messages/es';

/**
 * Sets the title of the document to `<title> — MailySoft Backoffice`, or to the name of the
 * application alone when there is none, so that each screen is named for whoever reads the tab
 * or the history (WCAG 2.4.2).
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title =
      title === undefined ? messages.common.appName : `${title} — ${messages.common.appName}`;
  }, [title]);
}
