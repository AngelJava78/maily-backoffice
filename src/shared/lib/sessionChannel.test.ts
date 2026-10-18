import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSessionChannel,
  SESSION_CHANNEL_NAME,
  type SessionChannel,
  type SessionMessage,
} from './sessionChannel';

const loggedOut: SessionMessage = { type: 'session-ended', reason: 'logout' };
const idle: SessionMessage = { type: 'session-ended', reason: 'idle' };
const active: SessionMessage = { type: 'activity' };

const opened: { close: () => void }[] = [];

/** A channel that the test closes when it ends, so nothing keeps the process alive. */
function open(): SessionChannel {
  const channel = createSessionChannel();
  opened.push(channel);
  return channel;
}

function openRaw(): BroadcastChannel {
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  opened.push(channel);
  return channel;
}

function collect(channel: SessionChannel): SessionMessage[] {
  const received: SessionMessage[] = [];
  channel.subscribe((message) => {
    received.push(message);
  });
  return received;
}

afterEach(() => {
  for (const channel of opened.splice(0)) {
    channel.close();
  }
  vi.unstubAllGlobals();
});

describe('createSessionChannel', () => {
  it('uses a channel named after the application', () => {
    expect(SESSION_CHANNEL_NAME).toBe('mailysoft-backoffice-session');
  });

  it('delivers what one instance posts to the other instances (US3-4)', async () => {
    const sender = open();
    const receiver = open();
    const received = collect(receiver);

    sender.post(loggedOut);
    sender.post(idle);

    await vi.waitFor(() => {
      expect(received).toEqual([loggedOut, idle]);
    });
  });

  it('does not deliver a message to the instance that posted it', async () => {
    const sender = open();
    const receiver = open();
    const echoed = collect(sender);
    const received = collect(receiver);

    sender.post(loggedOut);

    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });
    expect(echoed).toEqual([]);
  });

  it('stops listening to the others once it has announced the end of its own session', async () => {
    const leaver = open();
    const other = open();
    const heardByLeaver = collect(leaver);
    const heardByOther = collect(other);

    leaver.post(loggedOut);
    await vi.waitFor(() => {
      expect(heardByOther).toEqual([loggedOut]);
    });
    other.post(idle);

    // Give the message of the other tab the time it would need to arrive.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(heardByLeaver).toEqual([]);
  });

  it('delivers the activity of a tab to the others, and announcing it does not make it stop listening (FR-020)', async () => {
    const first = open();
    const second = open();
    const heardByFirst = collect(first);
    const heardBySecond = collect(second);

    first.post(active);
    await vi.waitFor(() => {
      expect(heardBySecond).toEqual([active]);
    });
    second.post(active);

    await vi.waitFor(() => {
      expect(heardByFirst).toEqual([active]);
    });
    // Neither of them heard its own message.
    expect(heardBySecond).toEqual([active]);
  });

  it('keeps listening to the others after it posted activity, and still hears the end of a session', async () => {
    const tab = open();
    const other = open();
    const heard = collect(tab);

    tab.post(active);
    other.post(loggedOut);

    await vi.waitFor(() => {
      expect(heard).toEqual([loggedOut]);
    });
  });

  it('listens again after it was closed and used again', async () => {
    const leaver = open();
    const other = open();
    leaver.post(loggedOut);
    leaver.close();
    const heardByLeaver = collect(leaver);

    other.post(idle);

    await vi.waitFor(() => {
      expect(heardByLeaver).toEqual([idle]);
    });
  });

  it('delivers to every subscriber of an instance', async () => {
    const sender = open();
    const receiver = open();
    const first = collect(receiver);
    const second = collect(receiver);

    sender.post(loggedOut);

    await vi.waitFor(() => {
      expect(first).toEqual([loggedOut]);
      expect(second).toEqual([loggedOut]);
    });
  });

  it('ignores messages that do not have the expected shape', async () => {
    const receiver = open();
    const received = collect(receiver);
    const raw = openRaw();

    raw.postMessage('session-ended');
    raw.postMessage(null);
    raw.postMessage({ type: 'something-else', reason: 'logout' });
    raw.postMessage({ type: 'session-ended', reason: 'expired' });
    raw.postMessage({ type: 'session-ended' });
    raw.postMessage({ type: 'session-ended', reason: 'idle' });

    await vi.waitFor(() => {
      expect(received).toEqual([idle]);
    });
  });

  it('stops delivering to a subscriber that unsubscribed', async () => {
    const sender = open();
    const receiver = open();
    const unsubscribed: SessionMessage[] = [];
    const unsubscribe = receiver.subscribe((message) => {
      unsubscribed.push(message);
    });
    const stillListening = collect(receiver);

    unsubscribe();
    sender.post(loggedOut);

    await vi.waitFor(() => {
      expect(stillListening).toEqual([loggedOut]);
    });
    expect(unsubscribed).toEqual([]);
  });

  it('stops delivering anything once it is closed', async () => {
    const sender = open();
    const receiver = open();
    const received = collect(receiver);
    const alive = collect(open());

    receiver.close();
    sender.post(loggedOut);

    await vi.waitFor(() => {
      expect(alive).toEqual([loggedOut]);
    });
    expect(received).toEqual([]);
  });

  it('can still post after it was closed, through a short-lived channel', async () => {
    const sender = open();
    const receiver = open();
    const received = collect(receiver);
    sender.close();

    expect(() => {
      sender.post(idle);
    }).not.toThrow();

    await vi.waitFor(() => {
      expect(received).toEqual([idle]);
    });
  });

  it('can be used again after it was closed', async () => {
    const sender = open();
    const receiver = open();
    collect(receiver);
    receiver.close();

    const received = collect(receiver);
    sender.post(loggedOut);

    await vi.waitFor(() => {
      expect(received).toEqual([loggedOut]);
    });
  });

  it('does nothing, without failing, when the browser has no BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const channel = createSessionChannel();
    const listener = vi.fn<(message: SessionMessage) => void>();

    const unsubscribe = channel.subscribe(listener);
    expect(() => {
      channel.post(loggedOut);
      unsubscribe();
      channel.close();
    }).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});
