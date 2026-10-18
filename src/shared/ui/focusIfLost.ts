/**
 * Puts the focus on `target` if it fell to the page itself, which is what happens when a dialog is
 * closed and the button that opened it is gone: the dialog gives the focus back to that button when
 * it can, and otherwise the person would have to start from the top of the page. It does nothing if
 * the focus is anywhere in the page. Called when the dialog has finished closing (and a moment
 * later, so that the dialog is out of the page and has let go of the focus).
 */
export function focusIfLost(target: HTMLElement | null): void {
  const { activeElement } = document;
  if (activeElement === null || activeElement === document.body) {
    target?.focus();
  }
}

/** The moment after a dialog has finished closing, in which the focus can be checked. */
export function afterDialogClosed(callback: () => void): void {
  window.setTimeout(callback, 0);
}
