import { describe, expect, it } from 'vitest';

import { publicStatusSchema } from './publicStatus';

/** The example of P1 (contracts/public-status.md), with changes. */
function exampleDto(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    status: 'degraded',
    checked_at: '2026-10-31T04:00:03Z',
    components: [
      {
        code: 'maily-system-api',
        name: 'MailySoft System API',
        kind: 'service',
        status: 'degraded',
        next_start_at: null,
      },
      {
        code: 'database',
        name: 'Base de datos',
        kind: 'database',
        status: 'stopped',
        next_start_at: '2026-11-02T14:00:00Z',
      },
      {
        code: 'mailysoft-usuarios',
        name: 'MailySoft Usuarios',
        kind: 'service',
        status: 'degraded',
        next_start_at: null,
      },
    ],
    ...overrides,
  };
}

/** The example with its first component changed. */
function withComponent(overrides: Readonly<Record<string, unknown>>) {
  const [first, ...rest] = exampleDto().components;
  return exampleDto({ components: [{ ...first, ...overrides }, ...rest] });
}

describe('publicStatusSchema', () => {
  it('gives the status of the platform, in the order received', () => {
    expect(publicStatusSchema.parse(exampleDto())).toEqual({
      status: 'degraded',
      checkedAt: '2026-10-31T04:00:03Z',
      components: [
        {
          code: 'maily-system-api',
          name: 'MailySoft System API',
          kind: 'service',
          status: 'degraded',
          nextStartAt: null,
        },
        {
          code: 'database',
          name: 'Base de datos',
          kind: 'database',
          status: 'stopped',
          nextStartAt: '2026-11-02T14:00:00Z',
        },
        {
          code: 'mailysoft-usuarios',
          name: 'MailySoft Usuarios',
          kind: 'service',
          status: 'degraded',
          nextStartAt: null,
        },
      ],
    });
  });

  it('accepts an empty list', () => {
    expect(publicStatusSchema.parse(exampleDto({ components: [] })).components).toEqual([]);
  });

  it('keeps a status and a kind it does not know as unknown (FR-057)', () => {
    const status = publicStatusSchema.parse(
      exampleDto({
        status: 'maintenance',
        components: [{ ...exampleDto().components[0], status: 'maintenance', kind: 'queue' }],
      }),
    );

    expect(status.status).toBe('unknown');
    expect(status.components[0]).toMatchObject({ status: 'unknown', kind: 'unknown' });
  });

  it.each([
    ['no list of components', exampleDto({ components: undefined })],
    ['a component with an empty name', withComponent({ name: '' })],
    ['a component without code', withComponent({ code: undefined })],
    ['a next start that is not a date', withComponent({ next_start_at: 'mañana' })],
    ['a next start that is missing', withComponent({ next_start_at: undefined })],
    ['an invalid date of the status', exampleDto({ checked_at: 'ahora' })],
  ])('rejects %s (US5-4)', (_label, dto) => {
    expect(publicStatusSchema.safeParse(dto).success).toBe(false);
  });

  it('discards anything else the answer brings: it never reaches the screen (SC-014)', () => {
    const status = publicStatusSchema.parse({
      ...withComponent({
        version: '2.1.0',
        latency_ms: 12,
        checks: [],
        error: 'timeout',
        base_url: 'http://x',
      }),
      registry_available: false,
    });

    expect(Object.keys(status)).toEqual(['status', 'checkedAt', 'components']);
    expect(Object.keys(status.components[0] ?? {})).toEqual([
      'code',
      'name',
      'kind',
      'status',
      'nextStartAt',
    ]);
  });
});
