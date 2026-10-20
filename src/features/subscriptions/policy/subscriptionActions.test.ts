import { describe, expect, it } from 'vitest';

import {
  getDeleteAvailability,
  getStatusTargets,
  needsStatusConfirmation,
} from './subscriptionActions';

describe('getStatusTargets', () => {
  it.each([
    [1, [2, 3]],
    [2, [1, 3]],
    [3, [1, 2]],
  ])('offers, for the status %i, the other two in the order 1, 2, 3', (statusId, targets) => {
    expect(getStatusTargets(statusId)).toEqual(targets);
  });

  it.each([5, 99])('offers the three for a status it does not know (%i)', (statusId) => {
    expect(getStatusTargets(statusId)).toEqual([1, 2, 3]);
  });

  it('gives a new list each time, so changing one does not change the next', () => {
    const first = [...getStatusTargets(1)];
    first.push(1);

    expect(getStatusTargets(1)).toEqual([2, 3]);
  });
});

describe('needsStatusConfirmation', () => {
  it('applies the activation directly', () => {
    expect(needsStatusConfirmation(1)).toBe(false);
  });

  it.each([2, 3])('asks to confirm the status %i (Inactiva and Bloqueada)', (targetId) => {
    expect(needsStatusConfirmation(targetId)).toBe(true);
  });
});

describe('getDeleteAvailability', () => {
  it.each([null, 0])('allows the deletion with %s clinics: the platform decides', (clinics) => {
    expect(getDeleteAvailability(clinics)).toEqual({ kind: 'allowed' });
  });

  it.each([1, 3])('blocks the deletion with %i clinics, and says how many', (clinics) => {
    expect(getDeleteAvailability(clinics)).toEqual({ kind: 'blocked', clinics });
  });
});
