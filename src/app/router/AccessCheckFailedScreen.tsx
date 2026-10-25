import { Suspense, useState } from 'react';

import { AccessCheckFailedPage, type OperatorAccessState } from '@/features/auth';
import {
  AccessCheckFallback,
  FallbackFailedPlaceholder,
  FallbackLoadingPlaceholder,
} from '@/features/health';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

type FailedAccess = Extract<OperatorAccessState, { readonly status: 'failed' }>;

/**
 * «No se pudo comprobar el acceso» with the sections of feature 016 (research D9): `auth` draws
 * the screen and knows nothing of what it receives, and `health` draws the sections, which load
 * apart and whose failure to load is the failure of FR-060, never a broken screen. Each
 * «Reintentar» is a new round of the chain, which waits while the access is checked (FR-065).
 */
export function AccessCheckFailedScreen({ access }: { readonly access: FailedAccess }) {
  const [round, setRound] = useState(0);
  // Asked for, but the check has not started yet: the new round must wait for it too.
  const [awaitingCheck, setAwaitingCheck] = useState(false);
  if (awaitingCheck && access.isChecking) {
    setAwaitingCheck(false);
  }

  return (
    <AccessCheckFailedPage
      email={access.accountEmail}
      refetch={() => {
        setRound((current) => current + 1);
        setAwaitingCheck(true);
        access.refetch();
      }}
    >
      <ErrorBoundary fallback={<FallbackFailedPlaceholder />}>
        <Suspense fallback={<FallbackLoadingPlaceholder />}>
          <AccessCheckFallback round={round} paused={access.isChecking || awaitingCheck} />
        </Suspense>
      </ErrorBoundary>
    </AccessCheckFailedPage>
  );
}
