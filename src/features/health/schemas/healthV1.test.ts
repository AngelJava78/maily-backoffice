import { describe, expect, it } from 'vitest';

import { liveBodySchema, readyBodySchema } from './healthV1';

const databaseDown = { name: 'database', status: 'error', latency_ms: 2001, error: 'timeout' };

describe('liveBodySchema', () => {
  it('accepts the body of the contract, also with more fields', () => {
    expect(liveBodySchema.safeParse({ status: 'ok' }).success).toBe(true);
    expect(liveBodySchema.safeParse({ status: 'ok', service: 'mailysoft-usuarios' }).success).toBe(
      true,
    );
  });

  it.each([{ status: 'down' }, {}, undefined, 'ok'])('rejects %j', (body) => {
    expect(liveBodySchema.safeParse(body).success).toBe(false);
  });
});

describe('readyBodySchema', () => {
  it('accepts both bodies of the contract, with their checks', () => {
    expect(
      readyBodySchema.safeParse({
        status: 'ok',
        checks: [{ name: 'database', status: 'ok', latency_ms: 12, error: null }],
      }).success,
    ).toBe(true);
    expect(
      readyBodySchema.safeParse({ status: 'unavailable', checks: [databaseDown] }).success,
    ).toBe(true);
  });

  it('accepts names and codes it does not know', () => {
    expect(
      readyBodySchema.safeParse({
        status: 'unavailable',
        checks: [{ name: 'cache', status: 'degraded', latency_ms: null, error: 'quota_exceeded' }],
      }).success,
    ).toBe(true);
  });

  it.each([
    ['no checks', { status: 'unavailable' }],
    [
      'a check without name',
      { status: 'unavailable', checks: [{ ...databaseDown, name: undefined }] },
    ],
    [
      'a check without latency',
      { status: 'unavailable', checks: [{ ...databaseDown, latency_ms: undefined }] },
    ],
    ['a status it does not know', { status: 'down', checks: [] }],
  ])('rejects %s', (_label, body) => {
    expect(readyBodySchema.safeParse(body).success).toBe(false);
  });
});
