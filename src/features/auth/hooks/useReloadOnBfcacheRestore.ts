import { useEffect } from 'react';

function reloadPage(): void {
  window.location.reload();
}

/**
 * Browsers may restore a page from their back/forward cache exactly as it was left, which would
 * show data of a session that already ended after pressing Back (FR-011, US3-2). In that case the
 * page is loaded again, so the session is checked from scratch.
 */
export function useReloadOnBfcacheRestore(reload: () => void = reloadPage): void {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [reload]);
}
