import { describe, expect, it } from 'vitest';

import { parseComponentId } from './componentId';

const ID = '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f60';

describe('parseComponentId', () => {
  it('accepts a UUID, and gives it in lower case as the service does', () => {
    expect(parseComponentId(ID)).toBe(ID);
    expect(parseComponentId(ID.toUpperCase())).toBe(ID);
  });

  it.each([undefined, '', 'no-es-un-uuid', '42', ID.slice(0, -1), ` ${ID}`, `${ID}0`])(
    'gives null for %j',
    (value) => {
      expect(parseComponentId(value)).toBeNull();
    },
  );
});
