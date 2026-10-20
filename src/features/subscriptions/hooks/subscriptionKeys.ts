/**
 * The TanStack Query keys of the subscriptions (constitution III): written here and nowhere else.
 * The API returns the whole catalog without pages, so there is one key for it, and the page is cut
 * when the list is drawn; each detail has its own.
 */
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  catalog: () => [...subscriptionKeys.all, 'catalog'] as const,
  detail: (subscriptionId: number) => [...subscriptionKeys.all, 'detail', subscriptionId] as const,
};
