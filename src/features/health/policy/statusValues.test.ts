import { describe, expect, it } from 'vitest';

import { toCheckStatus, toComponentKind, toComponentStatus, toOverallStatus } from './statusValues';

describe('toComponentStatus', () => {
  it.each(['up', 'degraded', 'down', 'stopped', 'unknown'])('keeps %j', (status) => {
    expect(toComponentStatus(status)).toBe(status);
  });

  it.each(['maintenance', '', 'UP', 'ok'])('turns %j into unknown', (status) => {
    expect(toComponentStatus(status)).toBe('unknown');
  });
});

describe('toOverallStatus', () => {
  it.each(['ok', 'degraded', 'down'])('keeps %j', (status) => {
    expect(toOverallStatus(status)).toBe(status);
  });

  it.each(['maintenance', '', 'up', 'stopped'])('turns %j into unknown', (status) => {
    expect(toOverallStatus(status)).toBe('unknown');
  });
});

describe('toComponentKind', () => {
  it.each(['service', 'database', 'frontend'])('keeps %j', (kind) => {
    expect(toComponentKind(kind)).toBe(kind);
  });

  it.each(['queue', '', 'Service'])('turns %j into unknown', (kind) => {
    expect(toComponentKind(kind)).toBe('unknown');
  });
});

describe('toCheckStatus', () => {
  it.each(['ok', 'error'])('keeps %j', (status) => {
    expect(toCheckStatus(status)).toBe(status);
  });

  it.each(['warning', '', 'unavailable'])('turns %j into unknown', (status) => {
    expect(toCheckStatus(status)).toBe('unknown');
  });
});
