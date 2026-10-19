/** Query keys of the access cache. The `sub` keys it by person, so another session never reuses it. */
export const accessKeys = {
  operator: (sub: string | null) => ['auth', 'access', sub] as const,
};
