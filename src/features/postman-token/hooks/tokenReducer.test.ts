import { describe, expect, it } from 'vitest';

import type { IssuedToken } from '../schemas/accessToken';
import { initialTokenState, tokenReducer, type TokenScreenState } from './tokenReducer';

const FIRST: IssuedToken = { value: 'first.token.value', expiresAt: '2030-03-17T17:46:40.000Z' };
const SECOND: IssuedToken = { value: 'second.token.value', expiresAt: '2030-03-18T17:46:40.000Z' };

const withToken: TokenScreenState = {
  token: FIRST,
  revealed: true,
  status: 'idle',
  failure: null,
  now: 1_000,
};

describe('tokenReducer (data-model TokenScreenState)', () => {
  it('starts with no token, hidden, idle, without failure and with the clock at 0', () => {
    expect(initialTokenState).toEqual({
      token: null,
      revealed: false,
      status: 'idle',
      failure: null,
      now: 0,
    });
  });

  describe('requested', () => {
    it('waits for the answer, clears the failure and changes neither the token nor its visibility', () => {
      const state = tokenReducer({ ...withToken, failure: 'unknown' }, { type: 'requested' });

      expect(state).toEqual({ ...withToken, status: 'pending', failure: null });
    });

    it('is ignored while a request is already waiting (FR-016)', () => {
      const pending: TokenScreenState = { ...withToken, status: 'pending' };

      expect(tokenReducer(pending, { type: 'requested' })).toBe(pending);
    });
  });

  describe('issued', () => {
    it('replaces the token, hides it, sets the clock and ends the wait (FR-010, FR-015)', () => {
      const pending: TokenScreenState = { ...withToken, status: 'pending', failure: 'unknown' };

      const state = tokenReducer(pending, { type: 'issued', token: SECOND, now: 5_000 });

      expect(state).toEqual({
        token: SECOND,
        revealed: false,
        status: 'idle',
        failure: null,
        now: 5_000,
      });
    });
  });

  describe('failed', () => {
    it('ends the wait with the kind of failure and keeps the token and its visibility (FR-019)', () => {
      const pending: TokenScreenState = { ...withToken, status: 'pending' };

      const state = tokenReducer(pending, { type: 'failed', kind: 'session-expired' });

      expect(state).toEqual({ ...withToken, status: 'idle', failure: 'session-expired' });
    });

    it('leaves a screen without token as it was, with the failure', () => {
      const pending: TokenScreenState = { ...initialTokenState, status: 'pending' };

      expect(tokenReducer(pending, { type: 'failed', kind: 'unknown' })).toEqual({
        ...initialTokenState,
        failure: 'unknown',
      });
    });
  });

  describe('revealToggled', () => {
    it('flips the visibility of the token', () => {
      const hidden = tokenReducer(withToken, { type: 'revealToggled' });
      const shown = tokenReducer(hidden, { type: 'revealToggled' });

      expect(hidden.revealed).toBe(false);
      expect(shown.revealed).toBe(true);
    });

    it('does nothing when there is no token', () => {
      expect(tokenReducer(initialTokenState, { type: 'revealToggled' })).toBe(initialTokenState);
    });
  });

  describe('ticked', () => {
    it('only moves the clock', () => {
      expect(tokenReducer(withToken, { type: 'ticked', now: 9_000 })).toEqual({
        ...withToken,
        now: 9_000,
      });
    });
  });

  it('does not change the state it receives', () => {
    const frozen = Object.freeze({ ...withToken });

    expect(() => tokenReducer(frozen, { type: 'requested' })).not.toThrow();
    expect(() => tokenReducer(frozen, { type: 'issued', token: SECOND, now: 1 })).not.toThrow();
    expect(() => tokenReducer(frozen, { type: 'failed', kind: 'unknown' })).not.toThrow();
    expect(() => tokenReducer(frozen, { type: 'revealToggled' })).not.toThrow();
    expect(() => tokenReducer(frozen, { type: 'ticked', now: 2 })).not.toThrow();
    expect(frozen).toEqual(withToken);
  });
});
