import { describe, expect, it } from 'vitest';

import { parseModulesSearchParams, toModulesSearchParams } from './modulesLocation';

describe('parseModulesSearchParams', () => {
  it('defaults to all types, active status, no search and no panel', () => {
    expect(parseModulesSearchParams(new URLSearchParams())).toEqual({
      type: 'all',
      status: 'active',
      search: '',
      panel: { kind: 'none' },
    });
  });

  it('reads type_id=1 as system and type_id=2 as clinic', () => {
    expect(parseModulesSearchParams(new URLSearchParams('type_id=1')).type).toBe('system');
    expect(parseModulesSearchParams(new URLSearchParams('type_id=2')).type).toBe('clinic');
  });

  it('treats any other type_id as "all"', () => {
    expect(parseModulesSearchParams(new URLSearchParams('type_id=9')).type).toBe('all');
  });

  it('reads status_id=2 as blocked, anything else as active', () => {
    expect(parseModulesSearchParams(new URLSearchParams('status_id=2')).status).toBe('blocked');
    expect(parseModulesSearchParams(new URLSearchParams('status_id=1')).status).toBe('active');
    expect(parseModulesSearchParams(new URLSearchParams()).status).toBe('active');
  });

  it('reads q as the search text', () => {
    expect(parseModulesSearchParams(new URLSearchParams('q=agenda')).search).toBe('agenda');
  });

  it('reads edit=<id> as the edit panel', () => {
    expect(parseModulesSearchParams(new URLSearchParams('edit=42')).panel).toEqual({
      kind: 'edit',
      moduleId: 42,
    });
  });

  it('reads new=1 as the create panel', () => {
    expect(parseModulesSearchParams(new URLSearchParams('new=1')).panel).toEqual({
      kind: 'create',
    });
  });

  it('gives edit priority over new when both are present', () => {
    expect(parseModulesSearchParams(new URLSearchParams('edit=7&new=1')).panel).toEqual({
      kind: 'edit',
      moduleId: 7,
    });
  });

  it('ignores an edit id that is not a positive integer', () => {
    expect(parseModulesSearchParams(new URLSearchParams('edit=abc')).panel).toEqual({
      kind: 'none',
    });
  });
});

describe('toModulesSearchParams', () => {
  it('omits every parameter at its default value', () => {
    expect(
      toModulesSearchParams({
        type: 'all',
        status: 'active',
        search: '',
        panel: { kind: 'none' },
      }).toString(),
    ).toBe('');
  });

  it('writes type_id, status_id and q when they are not the default', () => {
    const params = toModulesSearchParams({
      type: 'clinic',
      status: 'blocked',
      search: 'agenda',
      panel: { kind: 'none' },
    });
    expect(params.get('type_id')).toBe('2');
    expect(params.get('status_id')).toBe('2');
    expect(params.get('q')).toBe('agenda');
  });

  it('writes edit=<id> for the edit panel', () => {
    const params = toModulesSearchParams({
      type: 'all',
      status: 'active',
      search: '',
      panel: { kind: 'edit', moduleId: 42 },
    });
    expect(params.get('edit')).toBe('42');
    expect(params.has('new')).toBe(false);
  });

  it('writes new=1 for the create panel', () => {
    const params = toModulesSearchParams({
      type: 'all',
      status: 'active',
      search: '',
      panel: { kind: 'create' },
    });
    expect(params.get('new')).toBe('1');
  });
});
