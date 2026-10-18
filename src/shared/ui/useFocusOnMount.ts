import { useEffect, useRef, type RefObject } from 'react';

/**
 * Moves the keyboard focus to the element the returned ref is attached to when the component
 * mounts, so a screen reader announces the new page. The element needs `tabIndex={-1}`.
 */
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return ref;
}
