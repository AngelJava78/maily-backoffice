import { act, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/shared/lib/logger';
import { messages } from '@/shared/messages/es';
import { createWrapper } from '@/test/renderWithProviders';

import { useCopyToken } from './useCopyToken';

const TOKEN = 'header.payload.signature';

function setup() {
  // `userEvent.setup()` installs the clipboard that the tests use.
  userEvent.setup();
  const harness = createWrapper();
  return renderHook(() => useCopyToken(), { wrapper: harness.wrapper });
}

describe('useCopyToken', () => {
  it('copies the whole value and says so (FR-011)', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current(TOKEN);
    });

    await expect(navigator.clipboard.readText()).resolves.toBe(TOKEN);
    expect(await screen.findByText(messages.token.copied)).toBeInTheDocument();
  });

  it('says it could not copy, and does not fail, when the browser refuses (research D9)', async () => {
    const { result } = setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await act(async () => {
      await result.current(TOKEN);
    });

    expect(await screen.findByText(messages.token.copyFailed)).toBeInTheDocument();
    expect(screen.queryByText(messages.token.copied)).not.toBeInTheDocument();
  });

  it('says the same when the browser has no clipboard at all', async () => {
    const { result } = setup();
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    try {
      await act(async () => {
        await result.current(TOKEN);
      });

      expect(await screen.findByText(messages.token.copyFailed)).toBeInTheDocument();
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(navigator, 'clipboard');
      } else {
        Object.defineProperty(navigator, 'clipboard', original);
      }
    }
  });

  it('never logs the value', async () => {
    const { result } = setup();
    const logged = [
      vi.spyOn(logger, 'debug'),
      vi.spyOn(logger, 'info'),
      vi.spyOn(logger, 'warn'),
      vi.spyOn(logger, 'error'),
    ];
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await act(async () => {
      await result.current(TOKEN);
    });

    for (const spy of logged) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
