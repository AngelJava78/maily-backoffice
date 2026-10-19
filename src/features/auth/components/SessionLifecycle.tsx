import { useLogout } from '../hooks/useLogout';
import { useSessionLifecycle } from '../hooks/useSessionLifecycle';
import { IdleWarningDialog } from './IdleWarningDialog';

/** Watches the inactivity of the person and shows the warning before the session closes. */
export function SessionLifecycle() {
  const { isPrompted, getRemainingTimeMs, continueSession } = useSessionLifecycle();
  const logout = useLogout();

  return (
    <IdleWarningDialog
      open={isPrompted}
      getRemainingTimeMs={getRemainingTimeMs}
      onContinue={continueSession}
      onLogout={() => {
        void logout();
      }}
    />
  );
}
