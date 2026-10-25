import { describe, expect, it } from 'vitest';

import { healthKeys } from './healthKeys';

const everyKey = [
  healthKeys.cycle(),
  healthKeys.result(),
  healthKeys.platformStatus('page'),
  healthKeys.platformStatus('access'),
  healthKeys.directCheck('page'),
  healthKeys.directCheck('access'),
  healthKeys.accessChain(0),
  healthKeys.accessChain(1),
  healthKeys.componentsList(),
  healthKeys.componentDetail('7d3c2f0e-9a1b-4c5d-8e6f-0a1b2c3d4e5f'),
];

describe('healthKeys', () => {
  it('starts every key with the key of the whole feature', () => {
    for (const key of everyKey) {
      expect(key.slice(0, healthKeys.all.length)).toEqual([...healthKeys.all]);
    }
  });

  it('never gives two queries the same key', () => {
    const distinct = new Set(everyKey.map((key) => JSON.stringify(key)));

    expect(distinct.size).toBe(everyKey.length);
  });

  it('keeps the two screens apart in the steps of the chain', () => {
    expect(healthKeys.platformStatus('page')).not.toEqual(healthKeys.platformStatus('access'));
    expect(healthKeys.directCheck('page')).not.toEqual(healthKeys.directCheck('access'));
  });
});
