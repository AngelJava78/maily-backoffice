import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeReturnPath, saveReturnPath } from './returnPathStorage';

const STORAGE_KEY = 'mailysoft-backoffice:return-path';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveReturnPath', () => {
  it('stores the pathname and only the pagination and sort parameters', () => {
    saveReturnPath({
      pathname: '/users',
      search: '?page=2&page_size=20&sort=name&q=maria%20lopez',
    });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('/users?page=2&page_size=20&sort=name');
  });

  it('stores / when the location is not a safe internal path', () => {
    saveReturnPath({ pathname: '//evil.example.com', search: '' });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('/');
  });

  it('replaces what was stored before', () => {
    saveReturnPath({ pathname: '/users', search: '' });
    saveReturnPath({ pathname: '/profile', search: '' });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('/profile');
  });

  it('does not fail when the browser refuses to store (private mode, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => {
      saveReturnPath({ pathname: '/profile', search: '' });
    }).not.toThrow();
  });
});

describe('consumeReturnPath', () => {
  it('returns what was stored and forgets it: it can be read once', () => {
    saveReturnPath({ pathname: '/profile', search: '?page=3' });

    expect(consumeReturnPath()).toBe('/profile?page=3');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(consumeReturnPath()).toBe('/');
  });

  it('returns / when nothing was stored', () => {
    expect(consumeReturnPath()).toBe('/');
  });

  it.each([
    'https://evil.example.com/profile',
    '//evil.example.com',
    'javascript:alert(1)',
    '/\\evil.example.com',
    'profile',
    '',
    '{"path":"/profile"}',
    '/\u0000',
  ])('returns / for the tampered value %j, and forgets it', (value) => {
    sessionStorage.setItem(STORAGE_KEY, value);

    expect(consumeReturnPath()).toBe('/');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns / when the browser refuses to read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    expect(consumeReturnPath()).toBe('/');
  });
});
