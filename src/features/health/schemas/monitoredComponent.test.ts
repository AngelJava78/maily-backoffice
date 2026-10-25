import { describe, expect, it } from 'vitest';

import { monitoredComponentListSchema, monitoredComponentSchema } from './monitoredComponent';

/** The example of `MonitoredComponentRead` (contracts/monitored-components.md), with changes. */
function exampleDto(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    id: '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f60',
    code: 'mailysoft-usuarios',
    name: 'MailySoft Usuarios',
    kind: 'service',
    base_url: 'http://mailysoft-usuarios:8000',
    live_path: '/health/live',
    ready_path: '/health/ready',
    info_path: '/info',
    enabled: true,
    sort_order: 10,
    created_at: '2026-10-24T17:00:00Z',
    updated_at: '2026-10-24T17:30:00Z',
    ...overrides,
  };
}

describe('monitoredComponentSchema', () => {
  it('gives the component in camelCase', () => {
    expect(monitoredComponentSchema.parse(exampleDto())).toEqual({
      id: '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f60',
      code: 'mailysoft-usuarios',
      name: 'MailySoft Usuarios',
      kind: 'service',
      baseUrl: 'http://mailysoft-usuarios:8000',
      livePath: '/health/live',
      readyPath: '/health/ready',
      infoPath: '/info',
      enabled: true,
      sortOrder: 10,
      createdAt: '2026-10-24T17:00:00Z',
      updatedAt: '2026-10-24T17:30:00Z',
    });
  });

  it('keeps a frontend without readiness nor information routes', () => {
    expect(
      monitoredComponentSchema.parse(
        exampleDto({ kind: 'frontend', ready_path: null, info_path: null }),
      ),
    ).toMatchObject({ kind: 'frontend', readyPath: null, infoPath: null });
  });

  it('keeps a kind it does not know as unknown, without breaking the answer', () => {
    expect(monitoredComponentSchema.parse(exampleDto({ kind: 'queue' })).kind).toBe('unknown');
  });

  it.each([
    ['an id that is not a UUID', { id: '42' }],
    ['no code', { code: undefined }],
    ['no base URL', { base_url: undefined }],
    ['no live path', { live_path: undefined }],
    ['an enabled that is not a boolean', { enabled: 'true' }],
    ['an order that is not a whole number', { sort_order: 1.5 }],
    ['an invalid creation date', { created_at: 'ayer' }],
    ['an invalid modification date', { updated_at: '2026-13-01T00:00:00Z' }],
  ])('rejects %s', (_label, overrides) => {
    expect(monitoredComponentSchema.safeParse(exampleDto(overrides)).success).toBe(false);
  });
});

describe('monitoredComponentListSchema', () => {
  it('reads an array without a wrapper, in the order of the service', () => {
    const list = monitoredComponentListSchema.parse([
      exampleDto({ id: '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f61', code: 'zeta', sort_order: 0 }),
      exampleDto({ id: '3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f62', code: 'alfa', sort_order: 5 }),
    ]);

    expect(list.map((component) => component.code)).toEqual(['zeta', 'alfa']);
  });

  it('rejects a wrapped list', () => {
    expect(monitoredComponentListSchema.safeParse({ items: [exampleDto()] }).success).toBe(false);
  });
});
