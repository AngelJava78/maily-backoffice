/** The page asked for in the list. */
export interface UserListParams {
  readonly page: number;
  readonly pageSize: number;
}

/**
 * The TanStack Query keys of the users (constitution III): written here and nowhere else. They are
 * nested so that a mutation can invalidate by prefix: `lists()` reaches every page of the list,
 * `searches()` every search by email and `detail(id)` a user together with its roles.
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  searches: () => [...userKeys.all, 'search'] as const,
  /** The email is trimmed and lower-cased: the service ignores both, so variants share the entry. */
  search: (email: string) => [...userKeys.searches(), email.trim().toLowerCase()] as const,
  detail: (userId: string) => [...userKeys.all, 'detail', userId] as const,
  roles: (userId: string) => [...userKeys.detail(userId), 'roles'] as const,
};

/** The catalog of roles that can be assigned; it does not depend on any user. */
export const roleKeys = {
  all: ['roles'] as const,
  catalog: () => [...roleKeys.all, 'catalog'] as const,
};
