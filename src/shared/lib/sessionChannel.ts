import { z } from 'zod';

/** Name shared by every tab of the application in the same browser. */
export const SESSION_CHANNEL_NAME = 'mailysoft-backoffice-session';

/** A tab ended the session, and why. */
const sessionEndedSchema = z.object({
  type: z.literal('session-ended'),
  reason: z.enum(['logout', 'idle']),
});

/** The person did something in a tab (pressed a key, clicked): every tab restarts its idle count. */
const activitySchema = z.object({ type: z.literal('activity') });

const sessionMessageSchema = z.discriminatedUnion('type', [sessionEndedSchema, activitySchema]);

export type SessionMessage = z.infer<typeof sessionMessageSchema>;
export type SessionEndedMessage = z.infer<typeof sessionEndedSchema>;

type Listener = (message: SessionMessage) => void;

export interface SessionChannel {
  /**
   * Tells the other tabs. The instance that posts never receives its own message. After it
   * announces that its own session ended it also ignores what the others say: a tab that is
   * leaving must not react to a tab that leaves at the same time (with several tabs idle together,
   * each one announces it).
   */
  post: (message: SessionMessage) => void;
  /** Calls the listener for each valid message from another tab; returns the way to stop. */
  subscribe: (listener: Listener) => () => void;
  /** Stops listening and frees the channel; the instance can be used again afterwards. */
  close: () => void;
}

const inertChannel: SessionChannel = {
  post: () => undefined,
  subscribe: () => () => undefined,
  close: () => undefined,
};

/**
 * Lets the tabs of the browser tell each other that the session ended (FR-011, US3-4) and that the
 * person is active (FR-020) through a `BroadcastChannel`. What arrives is a boundary: anything that
 * does not match the message schema is ignored. The browser channel is open only while somebody is
 * subscribed. Where `BroadcastChannel` does not exist the instance does nothing, and the tabs
 * simply do not sync.
 */
export function createSessionChannel(): SessionChannel {
  if (typeof BroadcastChannel === 'undefined') {
    return inertChannel;
  }

  const listeners = new Set<Listener>();
  let channel: BroadcastChannel | null = null;
  let leaving = false;

  function release(): void {
    channel?.close();
    channel = null;
  }

  function open(): BroadcastChannel {
    if (channel === null) {
      channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
      channel.addEventListener('message', (event: MessageEvent<unknown>) => {
        const message = sessionMessageSchema.safeParse(event.data);
        if (message.success && !leaving) {
          listeners.forEach((listener) => {
            listener(message.data);
          });
        }
      });
    }
    return channel;
  }

  return {
    post: (message) => {
      if (message.type === 'session-ended') {
        leaving = true;
      }
      if (channel !== null) {
        channel.postMessage(message);
        return;
      }
      // Nobody listens in this instance: a short-lived channel is enough to send the message.
      const transient = new BroadcastChannel(SESSION_CHANNEL_NAME);
      transient.postMessage(message);
      transient.close();
    },
    subscribe: (listener) => {
      open();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          release();
        }
      };
    },
    close: () => {
      leaving = false;
      listeners.clear();
      release();
    },
  };
}
