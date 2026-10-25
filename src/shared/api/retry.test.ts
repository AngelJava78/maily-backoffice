import { describe, expect, it } from 'vitest';

import { ApiError } from './ApiError';
import { MUTATION_RETRY, retryDelay, retryUpTo, shouldRetryQuery } from './retry';

describe('shouldRetryQuery', () => {
  const retryable = [
    ['a network failure', ApiError.network()],
    ['a timeout', ApiError.timeout()],
    ['a 500', ApiError.fromResponse(500, undefined)],
    ['a 503', ApiError.fromResponse(503, undefined)],
  ] as const;

  const notRetryable = [
    ['a 400', ApiError.fromResponse(400, undefined)],
    ['a 401', ApiError.fromResponse(401, undefined)],
    ['a 403', ApiError.fromResponse(403, undefined)],
    ['a 404', ApiError.fromResponse(404, undefined)],
    ['a 422', ApiError.fromResponse(422, undefined)],
    ['a contract failure', ApiError.contract(200, 'bad shape')],
  ] as const;

  it.each(retryable)('retries %s up to two times', (_label, error) => {
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
    expect(shouldRetryQuery(3, error)).toBe(false);
  });

  it.each(notRetryable)('never retries %s', (_label, error) => {
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it.each([new Error('boom'), new TypeError('x'), 'text', null, undefined, 500])(
    'never retries an error that is not an ApiError (%j)',
    (error) => {
      expect(shouldRetryQuery(0, error)).toBe(false);
    },
  );
});

describe('retryUpTo', () => {
  const retryOnce = retryUpTo(1);

  it.each([
    ['a network failure', ApiError.network()],
    ['a timeout', ApiError.timeout()],
    ['a 503', ApiError.fromResponse(503, undefined)],
  ] as const)('retries %s only once', (_label, error) => {
    expect(retryOnce(0, error)).toBe(true);
    expect(retryOnce(1, error)).toBe(false);
  });

  it.each([
    ['a 404', ApiError.fromResponse(404, undefined)],
    ['a contract failure', ApiError.contract(200, 'bad shape')],
    ['an error that is not an ApiError', new Error('boom')],
  ] as const)('never retries %s', (_label, error) => {
    expect(retryOnce(0, error)).toBe(false);
  });

  it('gives the rule of shouldRetryQuery with two retries', () => {
    const retryTwice = retryUpTo(2);
    const error = ApiError.network();

    expect([0, 1, 2].map((count) => retryTwice(count, error))).toEqual(
      [0, 1, 2].map((count) => shouldRetryQuery(count, error)),
    );
  });
});

describe('retryDelay', () => {
  it('grows exponentially from one second', () => {
    expect(retryDelay(0)).toBe(1_000);
    expect(retryDelay(1)).toBe(2_000);
    expect(retryDelay(2)).toBe(4_000);
  });

  it('is capped at four seconds', () => {
    expect(retryDelay(3)).toBe(4_000);
    expect(retryDelay(10)).toBe(4_000);
  });
});

describe('MUTATION_RETRY', () => {
  it('never retries mutations', () => {
    expect(MUTATION_RETRY).toBe(false);
  });
});
