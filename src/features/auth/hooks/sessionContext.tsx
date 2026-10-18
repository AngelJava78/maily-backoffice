import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { createSessionChannel, type SessionChannel } from '@/shared/lib/sessionChannel';

import type { AccessNotice } from '../session/accessLocationState';

/** A value that changes while the application runs and that components read with a subscription. */
interface NoticeStore {
  get: () => AccessNotice | undefined;
  set: (notice: AccessNotice) => void;
  subscribe: (listener: () => void) => () => void;
}

function createNoticeStore(): NoticeStore {
  let current: AccessNotice | undefined;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (notice) => {
      current = notice;
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

interface SessionContextValue {
  readonly channel: SessionChannel;
  readonly notice: NoticeStore;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * The cross-cutting state of the session of one tab, which is client state and never changes the
 * data of the platform:
 * - the channel with the other tabs. Whoever ends the session and whoever listens for others
 *   ending it share this instance, so a tab never reacts to its own notice;
 * - the notice to give at the access screen when the session ended without the person asking for
 *   it. The route guard is the only one that redirects, and it does not know why the session
 *   ended, so the reason travels here and not in the router state, whose updates are not ordered
 *   with those of Auth0.
 */
export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const [value] = useState<SessionContextValue>(() => ({
    channel: createSessionChannel(),
    notice: createNoticeStore(),
  }));

  useEffect(
    () => () => {
      value.channel.close();
    },
    [value],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error('The session hooks must be used inside a SessionProvider');
  }
  return session;
}

export function useSessionChannel(): SessionChannel {
  return useSession().channel;
}

/** The notice the access screen has to give because the session ended on its own, if any. */
export function useSessionNotice(): AccessNotice | undefined {
  const { notice } = useSession();
  return useSyncExternalStore(notice.subscribe, notice.get);
}

/** Returns the function that records why the session ended, for the access screen to say it. */
export function useAnnounceSessionNotice(): (notice: AccessNotice) => void {
  return useSession().notice.set;
}
