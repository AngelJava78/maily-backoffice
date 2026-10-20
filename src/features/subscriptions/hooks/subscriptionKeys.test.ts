import { partialMatchKey } from '@tanstack/react-query';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { subscriptionKeys } from './subscriptionKeys';

describe('subscriptionKeys', () => {
  it('keys everything of the section under one root', () => {
    expect(subscriptionKeys.all).toEqual(['subscriptions']);
  });

  it('keys the whole catalog, which the API returns without pages', () => {
    expect(subscriptionKeys.catalog()).toEqual(['subscriptions', 'catalog']);
  });

  it('keys the detail of a subscription by its id, which is a number', () => {
    expect(subscriptionKeys.detail(7)).toEqual(['subscriptions', 'detail', 7]);
  });

  it('keeps the catalog and the details apart, so invalidating one does not reach the other', () => {
    expect(partialMatchKey(subscriptionKeys.detail(7), subscriptionKeys.catalog())).toBe(false);
    expect(partialMatchKey(subscriptionKeys.catalog(), subscriptionKeys.detail(7))).toBe(false);
    expect(partialMatchKey(subscriptionKeys.detail(70), subscriptionKeys.detail(7))).toBe(false);
  });

  it('reaches everything of the section through its root, and nothing of the users', () => {
    expect(partialMatchKey(subscriptionKeys.catalog(), subscriptionKeys.all)).toBe(true);
    expect(partialMatchKey(subscriptionKeys.detail(7), subscriptionKeys.all)).toBe(true);
    expect(partialMatchKey(['users', 'detail', '7'], subscriptionKeys.all)).toBe(false);
  });

  it('gives a new key each time, typed as a tuple that cannot be changed', () => {
    expect(subscriptionKeys.detail(7)).not.toBe(subscriptionKeys.detail(7));
    expectTypeOf(subscriptionKeys.detail(7)).toEqualTypeOf<
      readonly ['subscriptions', 'detail', number]
    >();
    expectTypeOf(subscriptionKeys.catalog()).toEqualTypeOf<readonly ['subscriptions', 'catalog']>();
  });
});
