import { useEffect, useRef } from 'react';
import { useLocation, useMatches } from 'react-router';
import { z } from 'zod';

import { messages } from '@/shared/messages/es';
import { useDocumentTitle } from '@/shared/ui/useDocumentTitle';

const routeHandleSchema = z.object({
  titleKey: z.enum([
    'access',
    'home',
    'profile',
    'notFound',
    'users',
    'userCreate',
    'userDetail',
    'userEdit',
  ]),
});

type TitleKey = z.infer<typeof routeHandleSchema>['titleKey'];

/** The title key of the deepest route that declares one in its `handle`. */
function findTitleKey(matches: ReturnType<typeof useMatches>): TitleKey | undefined {
  for (const match of [...matches].reverse()) {
    const handle = routeHandleSchema.safeParse(match.handle);
    if (handle.success) {
      return handle.data.titleKey;
    }
  }
  return undefined;
}

/** After a navigation, takes the focus to the heading of the new page, or to the main region. */
function focusMainHeading(): void {
  const target =
    document.querySelector<HTMLElement>('main h1') ?? document.getElementById('main-content');
  target?.focus();
}

/**
 * Keeps the document title in step with the route (`<title> — MailySoft Backoffice`) and moves
 * the keyboard focus to the main heading after each navigation, so that a screen reader announces
 * the new page (constitution VI, WCAG 2.1 AA).
 */
export function useRouteAccessibility(): void {
  const matches = useMatches();
  const location = useLocation();
  const titleKey = findTitleKey(matches);
  const previousLocationKey = useRef(location.key);

  useDocumentTitle(titleKey === undefined ? undefined : messages.titles[titleKey]);

  useEffect(() => {
    if (previousLocationKey.current !== location.key) {
      previousLocationKey.current = location.key;
      focusMainHeading();
    }
  }, [location.key]);
}
