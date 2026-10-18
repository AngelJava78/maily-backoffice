/** Ids of the user statuses of the users service. Decisions use the id, never the name. */
export const USER_STATUS = {
  ACTIVE: 1,
  BLOCKED: 2,
  DELETED: 3,
} as const;

/** Only the active status can enter; blocked, deleted and any unknown status cannot. */
export function isActiveStatus(statusId: number): boolean {
  return statusId === USER_STATUS.ACTIVE;
}
