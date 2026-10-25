import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { decideDirectStatus, liveOutcomeOf, readyOutcomeOf } from './directCheckRules';

const { explanations } = messages.health.direct;

const LIVE = { status: 200, body: { status: 'ok' } };
const READY = {
  status: 200,
  body: { status: 'ok', checks: [{ name: 'database', status: 'ok', latency_ms: 12, error: null }] },
};
const check = (name: string, error: string | null, status = 'error') => ({
  name,
  status,
  latency_ms: 2001,
  error,
});
const unavailable = (...checks: ReturnType<typeof check>[]) => ({
  status: 503,
  body: { status: 'unavailable', checks },
});

/** The row of a service whose liveness and readiness answered these probes. */
function rowOf(
  live: Parameters<typeof liveOutcomeOf>[0],
  ready: Parameters<typeof readyOutcomeOf>[0],
) {
  return decideDirectStatus(liveOutcomeOf(live), readyOutcomeOf(ready));
}

describe('decideDirectStatus (contracts/health-v1-probes.md)', () => {
  it('is operational when both routes answer as they should', () => {
    expect(rowOf(LIVE, READY)).toEqual({ status: 'operational', explanations: [] });
  });

  it('is degraded with the database that does not answer (FR-069)', () => {
    expect(rowOf(LIVE, unavailable(check('database', 'timeout')))).toEqual({
      status: 'degraded',
      explanations: [explanations.database],
    });
  });

  it('is degraded with the configuration that is missing', () => {
    expect(rowOf(LIVE, unavailable(check('database', 'not_configured')))).toEqual({
      status: 'degraded',
      explanations: [explanations.notConfigured],
    });
  });

  it('is degraded with a check it does not know', () => {
    expect(rowOf(LIVE, unavailable(check('cache', 'timeout')))).toEqual({
      status: 'degraded',
      explanations: [explanations.unknownCheck],
    });
  });

  it('says each explanation once', () => {
    expect(
      rowOf(LIVE, unavailable(check('cache', 'timeout'), check('queue', 'timeout'))).explanations,
    ).toEqual([explanations.unknownCheck]);
  });

  it('says it is not ready when no check is in error', () => {
    expect(rowOf(LIVE, unavailable(check('database', null, 'ok')))).toEqual({
      status: 'degraded',
      explanations: [explanations.notReady],
    });
  });

  it.each([
    ['a 200 with unavailable', { status: 200, body: { status: 'unavailable', checks: [] } }],
    ['a 503 with ok', { status: 503, body: { status: 'ok', checks: [] } }],
    ['a 500', { status: 500, body: undefined }],
    ['a page of HTML', { status: 200, body: undefined }],
    ['a network failure or a time-out', null],
  ])('is degraded, not ready, when the readiness gives %s', (_label, ready) => {
    expect(rowOf(LIVE, ready)).toEqual({
      status: 'degraded',
      explanations: [explanations.notReady],
    });
  });

  it.each([
    ['a network failure or a time-out', null],
    ['a status that is not 2xx', { status: 503, body: { status: 'ok' } }],
    ['a page of HTML', { status: 200, body: undefined }],
    ['another body', { status: 200, body: { status: 'down' } }],
  ])('does not answer when the liveness gives %s, whatever the readiness says', (_label, live) => {
    expect(rowOf(live, READY)).toEqual({ status: 'unreachable', explanations: [] });
    expect(rowOf(live, unavailable(check('database', 'timeout'))).status).toBe('unreachable');
  });
});
