import { messages } from '@/shared/messages/es';
import { useNotify } from '@/shared/ui/Notifications';

/**
 * Returns the function that copies a value to the clipboard and tells the person whether it
 * worked (FR-011, research D9). When the browser refuses, or has no clipboard, it says so and
 * points to "Mostrar" so the token can be selected by hand; it never shows it by itself and
 * never logs it.
 */
export function useCopyToken(): (value: string) => Promise<void> {
  const notify = useNotify();

  return async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      notify({ severity: 'success', message: messages.token.copied });
    } catch {
      notify({ severity: 'error', message: messages.token.copyFailed });
    }
  };
}
