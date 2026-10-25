import { describe, expect, it } from 'vitest';

import { parseBuildInfo } from './buildInfo';

const COMMIT = '9fceb02d0ae598e95dc970b74767f19372d61af8';
const VALID = { version: '1.0.0', commit: COMMIT, buildDate: '2026-10-24T16:05:00Z' };

describe('parseBuildInfo', () => {
  it('gives the version, the commit and the date of the build (FR-044)', () => {
    expect(parseBuildInfo(VALID)).toEqual(VALID);
  });

  it.each(['1.0', 'v1', '1.0.0.0', 'uno', ''])('says nothing of a version %j', (version) => {
    expect(parseBuildInfo({ ...VALID, version }).version).toBeNull();
  });

  it.each(['9fceb0', 'a'.repeat(65), 'zzzzzzz', ''])('says nothing of a commit %j', (commit) => {
    expect(parseBuildInfo({ ...VALID, commit }).commit).toBeNull();
  });

  it('accepts a short commit of seven characters', () => {
    expect(parseBuildInfo({ ...VALID, commit: '9fceb02' }).commit).toBe('9fceb02');
  });

  it.each(['2026-10-24T16:05:00', 'ayer', ''])('says nothing of a date %j', (buildDate) => {
    expect(parseBuildInfo({ ...VALID, buildDate }).buildDate).toBeNull();
  });

  it('never throws, whatever it receives (FR-045)', () => {
    expect(() => parseBuildInfo({ version: ' ', commit: '\n', buildDate: '{}' })).not.toThrow();
    expect(parseBuildInfo({ version: '', commit: '', buildDate: '' })).toEqual({
      version: null,
      commit: null,
      buildDate: null,
    });
  });
});
