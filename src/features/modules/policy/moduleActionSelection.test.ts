import { describe, expect, it } from 'vitest';

import { withActionChecked } from './moduleActionSelection';

describe('withActionChecked', () => {
  it('unchecks "read" like any other action (022, FR-012: no more special case)', () => {
    const selected = new Set(['read', 'write'] as const);

    expect([...withActionChecked(selected, 'read', false)]).toEqual(['write']);
  });

  it('checks "read" like any other action', () => {
    const selected = new Set(['write'] as const);

    expect([...withActionChecked(selected, 'read', true)]).toEqual(['write', 'read']);
  });

  it('adds an action without touching the others', () => {
    const selected = new Set(['read'] as const);

    expect([...withActionChecked(selected, 'write', true)]).toEqual(['read', 'write']);
  });

  it('removes an action', () => {
    const selected = new Set(['read', 'write'] as const);

    expect([...withActionChecked(selected, 'write', false)]).toEqual(['read']);
  });

  it('does not mutate the set it receives', () => {
    const selected = new Set(['read'] as const);

    withActionChecked(selected, 'write', true);

    expect([...selected]).toEqual(['read']);
  });

  it('gives a new set, never the same reference', () => {
    const selected = new Set(['read'] as const);

    expect(withActionChecked(selected, 'write', true)).not.toBe(selected);
  });
});
