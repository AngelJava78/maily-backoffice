import { afterEach, describe, expect, it, vi } from 'vitest';

import { afterDialogClosed, focusIfLost } from './focusIfLost';

function addButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;
  document.body.append(button);
  return button;
}

describe('focusIfLost', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('moves the focus to the target when it fell to the page', () => {
    const target = addButton('Destino');
    const first = addButton('Primero');
    first.focus();
    first.blur();
    expect(document.activeElement).toBe(document.body);

    focusIfLost(target);

    expect(target).toHaveFocus();
  });

  it('moves the focus when the element that had it was taken out of the page', () => {
    const target = addButton('Destino');
    const gone = addButton('Se va');
    gone.focus();
    gone.remove();

    focusIfLost(target);

    expect(target).toHaveFocus();
  });

  it('leaves the focus alone when it is on something in the page', () => {
    const target = addButton('Destino');
    const other = addButton('Otro');
    other.focus();

    focusIfLost(target);

    expect(other).toHaveFocus();
  });

  it('does nothing when there is no target', () => {
    expect(() => {
      focusIfLost(null);
    }).not.toThrow();
  });
});

describe('afterDialogClosed', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs its callback in the next turn, not at once', () => {
    vi.useFakeTimers();
    const callback = vi.fn<() => void>();

    afterDialogClosed(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);

    expect(callback).toHaveBeenCalledOnce();
  });
});
