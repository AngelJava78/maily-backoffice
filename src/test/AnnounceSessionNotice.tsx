import { useEffect, type ReactNode } from 'react';

import { useAnnounceSessionNotice } from '@/features/auth/hooks/sessionContext';
import type { AccessNotice } from '@/features/auth/session/accessLocationState';

/**
 * What the route guard does when a session ends on its own: it leaves the reason for the access
 * screen, which is rendered inside. Lets a test start from that state without the whole guard.
 */
export function AnnounceSessionNotice({
  notice,
  children,
}: {
  readonly notice: AccessNotice;
  readonly children: ReactNode;
}) {
  const announce = useAnnounceSessionNotice();

  useEffect(() => {
    announce(notice);
  }, [announce, notice]);

  return <>{children}</>;
}
