import { describe, expect, it } from 'vitest';

import { MODULE_ACTION_ID, MODULE_ACTION_ORDER, MODULE_STATUS, MODULE_TYPE } from './moduleActionCatalog';

describe('moduleActionCatalog', () => {
  it('fixes the four actions in the order the mockup shows them', () => {
    expect(MODULE_ACTION_ORDER).toEqual(['read', 'write', 'update', 'delete']);
  });

  it('maps each action to its real id in the API', () => {
    expect(MODULE_ACTION_ID).toEqual({ read: 1, write: 2, update: 3, delete: 4 });
  });

  it('fixes the two module types', () => {
    expect(MODULE_TYPE).toEqual({ SYSTEM: 1, CLINIC: 2 });
  });

  it('fixes the two statuses this screen shows (never Eliminado)', () => {
    expect(MODULE_STATUS).toEqual({ ACTIVE: 1, BLOCKED: 2 });
  });
});
