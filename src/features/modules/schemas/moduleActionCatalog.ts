/**
 * Fixed catalogs of module types and actions (research D4): administered by hand on the platform,
 * not through any screen, so they are not fetched — same choice already made for the clinic module
 * catalog of the subscriptions feature.
 */
export const MODULE_ACTION_ORDER = ['read', 'write', 'update', 'delete'] as const;

export type ModuleActionKey = (typeof MODULE_ACTION_ORDER)[number];

/** The real id of each action in the platform (data-model.md of 013-modules-permissions-catalogs). */
export const MODULE_ACTION_ID: Readonly<Record<ModuleActionKey, number>> = {
  read: 1,
  write: 2,
  update: 3,
  delete: 4,
};

/** "Ver" can never be unchecked (FR-018): no other action makes sense without it. */
export const REQUIRED_ACTION_KEY: ModuleActionKey = 'read';

export const MODULE_TYPE = { SYSTEM: 1, CLINIC: 2 } as const;

export type ModuleTypeId = (typeof MODULE_TYPE)[keyof typeof MODULE_TYPE];

/** `3 Eliminado` is never used by this screen (FR-046 of the platform: never shown). */
export const MODULE_STATUS = { ACTIVE: 1, BLOCKED: 2 } as const;

export type ModuleStatusId = (typeof MODULE_STATUS)[keyof typeof MODULE_STATUS];
