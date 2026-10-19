import { useEffect, useRef } from 'react';
import { useLocation, useMatches } from 'react-router';
import { z } from 'zod';

import { parseUserId } from '@/features/users';
import { messages } from '@/shared/messages/es';
import { useDocumentTitle } from '@/shared/ui/useDocumentTitle';

const routeHandleSchema = z.object({
  /**
   * The route whose address holds the id of a user, such as `:userId`. If that text is not an id,
   * the page that shows is the one of an address that does not exist, so it is titled as that.
   */
  userIdParam: z.string().optional(),
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
      const { userIdParam, titleKey } = handle.data;
      const isNotAnId =
        userIdParam !== undefined && parseUserId(match.params[userIdParam]) === null;
      return isNotAnId ? 'notFound' : titleKey;
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
 * the keyboard focus to the main heading when the person arrives at another page, so that a screen
 * reader announces it (constitution VI, WCAG 2.1 AA). Changing only the query string of the same
 * page, such as going to the next page of a list, is not arriving anywhere: the focus stays on the
 * control that was used.
 */
export function useRouteAccessibility(): void {
  const matches = useMatches();
  const { pathname } = useLocation();
  const titleKey = findTitleKey(matches);
  const previousPathname = useRef(pathname);

  useDocumentTitle(titleKey === undefined ? undefined : messages.titles[titleKey]);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      focusMainHeading();
    }
  }, [pathname]);
}
