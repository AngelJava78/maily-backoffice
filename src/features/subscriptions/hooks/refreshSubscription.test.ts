import { QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { ApiError } from '@/shared/api/ApiError';
import { REFRESH_WAIT_MS } from '@/shared/lib/atMost';

import { isSubscriptionOutOfDate, refreshSubscription } from './refreshSubscription';
import { subscriptionKeys } from './subscriptionKeys';

const refusal = (status: number, code: string) =>
  ApiError.fromResponse(status, { code, message: 'Un mensaje de la API' });

describe('isSubscriptionOutOfDate', () => {
  it.each([
    [404, 'subscription_not_found', 'update'],
    [409, 'subscription_status_unchanged', 'changeStatus'],
    [409, 'subscription_has_clinics', 'delete'],
  ] as const)(
    'is true for the refusal %i %s: the subscription is not as the screen believes',
    (status, code, operation) => {
      expect(isSubscriptionOutOfDate(refusal(status, code), operation)).toBe(true);
    },
  );

  it.each([
    [409, 'subscription_name_already_exists', 'update'],
    [422, 'validation_error', 'create'],
    [503, 'clinics_check_unavailable', 'delete'],
    [503, 'authorization_unavailable', 'changeStatus'],
    [403, 'permission_denied', 'update'],
    [500, 'internal_error', 'delete'],
  ] as const)(
    'is false for the refusal %i %s: nothing changed that the screen shows',
    (status, code, operation) => {
      expect(isSubscriptionOutOfDate(refusal(status, code), operation)).toBe(false);
    },
  );

  it('is false for a failure without answer, for something that is not an error and for no error', () => {
    expect(isSubscriptionOutOfDate(ApiError.network(), 'update')).toBe(false);
    expect(isSubscriptionOutOfDate(new Error('boom'), 'delete')).toBe(false);
    expect(isSubscriptionOutOfDate(null, 'changeStatus')).toBe(false);
  });
});

describe('refreshSubscription', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function cached() {
    const queryClient = createQueryClient();
    const keys = {
      detail: subscriptionKeys.detail(7),
      otherDetail: subscriptionKeys.detail(70),
      catalog: subscriptionKeys.catalog(),
    };
    for (const key of Object.values(keys)) {
      queryClient.setQueryData(key, 'cached');
    }
    const stale = (key: keyof typeof keys) => queryClient.getQueryState(keys[key])?.isInvalidated;
    return { queryClient, stale };
  }

  it('marks the subscription and the catalog as stale, and no other subscription', async () => {
    const { queryClient, stale } = cached();

    await refreshSubscription(queryClient, 7);

    expect(stale('detail')).toBe(true);
    expect(stale('catalog')).toBe(true);
    expect(stale('otherDetail')).toBe(false);
  });

  it('ends once what is on screen was asked for again', async () => {
    const { queryClient } = cached();
    let answer: (value: string) => void = () => undefined;
    const observer = new QueryObserver(queryClient, {
      queryKey: subscriptionKeys.detail(7),
      queryFn: () =>
        new Promise<string>((resolve) => {
          answer = resolve;
        }),
    });
    const unsubscribe = observer.subscribe(() => undefined);
    let ended = false;

    const refreshing = refreshSubscription(queryClient, 7).then(() => {
      ended = true;
    });
    await Promise.resolve();
    expect(ended).toBe(false);

    answer('fresh');
    await refreshing;

    expect(ended).toBe(true);
    expect(queryClient.getQueryData(subscriptionKeys.detail(7))).toBe('fresh');
    unsubscribe();
  });

  it(`lets go after ${REFRESH_WAIT_MS} ms when the new query does not end`, async () => {
    vi.useFakeTimers();
    const { queryClient } = cached();
    const observer = new QueryObserver(queryClient, {
      queryKey: subscriptionKeys.catalog(),
      queryFn: () => new Promise<string>(() => undefined),
    });
    const unsubscribe = observer.subscribe(() => undefined);
    let ended = false;

    const refreshing = refreshSubscription(queryClient, 7).then(() => {
      ended = true;
    });
    await vi.advanceTimersByTimeAsync(REFRESH_WAIT_MS - 1);
    expect(ended).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await refreshing;

    expect(ended).toBe(true);
    unsubscribe();
  });
});
