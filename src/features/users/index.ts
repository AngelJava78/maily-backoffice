import { lazy } from 'react';

export { getAvailableActions } from './policy/availableActions';
export type { UserAction, UserCapabilities } from './policy/availableActions';
export { getDisplayName, getInitials, platformUserSchema } from './schemas/user';
export type { PlatformUser } from './schemas/user';
export { isActiveStatus, USER_STATUS } from './schemas/userStatus';
export { parseUserId } from './schemas/usersLocation';

// The screens are lazy components, in this file and not in the application: `auth`, which is part
// of the entry route, imports this file to read `PlatformUser`, and a static export of a screen
// would take the Data Grid and the forms into the entry. Only what is light is exported
// statically (research D2 of 002).
export const UsersListPage = lazy(() =>
  import('./components/UsersListPage').then((module) => ({ default: module.UsersListPage })),
);
export const UserDetailPage = lazy(() =>
  import('./components/UserDetailPage').then((module) => ({ default: module.UserDetailPage })),
);
export const UserCreatePage = lazy(() =>
  import('./components/UserCreatePage').then((module) => ({ default: module.UserCreatePage })),
);
export const UserEditPage = lazy(() =>
  import('./components/UserEditPage').then((module) => ({ default: module.UserEditPage })),
);
