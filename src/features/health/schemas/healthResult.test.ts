import { describe, expect, it } from 'vitest';

import { healthResultSchema, type HealthResultDto } from './healthResult';

/** The example of contracts/health-aggregator.md (A1): system-api degraded, the database stopped. */
function exampleDto(): HealthResultDto {
  return {
    status: 'degraded',
    checked_at: '2026-10-30T04:00:03Z',
    registry_available: false,
    components: [
      {
        code: 'maily-system-api',
        name: 'MailySoft System API',
        kind: 'service',
        status: 'degraded',
        latency_ms: 3001,
        checked_at: '2026-10-30T04:00:03Z',
        version: '2.1.0',
        commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
        build_date: '2026-10-24T15:30:00Z',
        environment: 'production',
        checks: [{ name: 'database', status: 'error', latency_ms: 3001, error: 'timeout' }],
        error: 'not_ready',
        next_start_at: null,
      },
      {
        code: 'database',
        name: 'Base de datos',
        kind: 'database',
        status: 'stopped',
        latency_ms: 3000,
        checked_at: '2026-10-30T04:00:03Z',
        version: 'unknown',
        commit: 'unknown',
        build_date: 'unknown',
        environment: 'unknown',
        checks: [],
        error: 'timeout',
        next_start_at: '2026-11-02T14:00:00Z',
      },
    ],
  };
}

type ComponentDto = HealthResultDto['components'][number];

function withComponent(overrides: Record<string, unknown>): unknown {
  const dto = exampleDto();
  const [first, ...rest] = dto.components;
  return { ...dto, components: [{ ...first, ...overrides }, ...rest] };
}

/** A copy of `source` without the key `name`. */
function without(source: object | undefined, name: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source ?? {}).filter(([key]) => key !== name));
}

function withoutComponentField(field: keyof ComponentDto): unknown {
  const dto = exampleDto();
  const [first, ...rest] = dto.components;
  return { ...dto, components: [without(first, field), ...rest] };
}

function firstComponentOf(input: unknown) {
  const parsed = healthResultSchema.parse(input);
  const [first] = parsed.components;
  if (first === undefined) {
    throw new Error('Expected a component');
  }
  return first;
}

describe('healthResultSchema', () => {
  it('turns the response into the domain model, keeping the order of the components', () => {
    const result = healthResultSchema.parse(exampleDto());

    expect(result).toEqual({
      status: 'degraded',
      checkedAt: '2026-10-30T04:00:03Z',
      registryAvailable: false,
      components: [
        {
          code: 'maily-system-api',
          name: 'MailySoft System API',
          kind: 'service',
          status: 'degraded',
          latencyMs: 3001,
          checkedAt: '2026-10-30T04:00:03Z',
          version: '2.1.0',
          commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
          buildDate: '2026-10-24T15:30:00Z',
          environment: 'production',
          checks: [{ name: 'database', status: 'error', latencyMs: 3001, error: 'timeout' }],
          error: 'not_ready',
          nextStartAt: null,
        },
        {
          code: 'database',
          name: 'Base de datos',
          kind: 'database',
          status: 'stopped',
          latencyMs: 3000,
          checkedAt: '2026-10-30T04:00:03Z',
          version: null,
          commit: null,
          buildDate: null,
          environment: null,
          checks: [],
          error: 'timeout',
          nextStartAt: '2026-11-02T14:00:00Z',
        },
      ],
    });
  });

  describe('values the Backoffice does not know (FR-009)', () => {
    it('keeps the response valid and turns them into unknown', () => {
      const result = healthResultSchema.parse({
        ...exampleDto(),
        status: 'maintenance',
        components: [
          {
            ...exampleDto().components[0],
            status: 'maintenance',
            kind: 'queue',
            error: 'quota_exceeded',
            checks: [{ name: 'cache', status: 'warning', latency_ms: 4, error: 'quota_exceeded' }],
          },
        ],
      });

      expect(result.status).toBe('unknown');
      expect(result.components[0]).toMatchObject({
        status: 'unknown',
        kind: 'unknown',
        error: 'quota_exceeded',
        checks: [{ name: 'cache', status: 'unknown', latencyMs: 4, error: 'quota_exceeded' }],
      });
    });
  });

  describe('data shown as «No disponible» (FR-014)', () => {
    it.each(['unknown', 'UNKNOWN', '', '   ', null])(
      'turns a version, commit and environment of %j into null',
      (value) => {
        const component = firstComponentOf(
          withComponent({ version: value, commit: value, environment: value }),
        );

        expect(component).toMatchObject({ version: null, commit: null, environment: null });
      },
    );

    it.each([
      'version',
      'commit',
      'environment',
      'build_date',
      'latency_ms',
      'checked_at',
    ] as const)('accepts a component without %s and shows it as null', (field) => {
      expect(() => healthResultSchema.parse(withoutComponentField(field))).not.toThrow();
    });

    it.each(['ayer', 'unknown', '2026-13-40T00:00:00Z', null])(
      'turns a build date of %j into null',
      (value) => {
        expect(firstComponentOf(withComponent({ build_date: value })).buildDate).toBeNull();
      },
    );

    it('turns an invalid date of the last check of a component into null', () => {
      expect(firstComponentOf(withComponent({ checked_at: 'hace un rato' })).checkedAt).toBeNull();
    });

    it('turns a null latency into null and keeps a latency of 0', () => {
      expect(firstComponentOf(withComponent({ latency_ms: null })).latencyMs).toBeNull();
      expect(firstComponentOf(withComponent({ latency_ms: 0 })).latencyMs).toBe(0);
    });

    it('trims the texts it keeps', () => {
      expect(firstComponentOf(withComponent({ version: '  2.1.0 ' })).version).toBe('2.1.0');
    });
  });

  describe('responses that break the contract (FR-009, edge case)', () => {
    it.each(['components', 'registry_available', 'checked_at', 'status'] as const)(
      'rejects a response without %s',
      (field) => {
        expect(healthResultSchema.safeParse(without(exampleDto(), field)).success).toBe(false);
      },
    );

    it('rejects an invalid date of the result', () => {
      expect(healthResultSchema.safeParse({ ...exampleDto(), checked_at: 'ahora' }).success).toBe(
        false,
      );
    });

    it.each(['code', 'name', 'kind', 'status', 'checks', 'error', 'next_start_at'] as const)(
      'rejects a component without %s',
      (field) => {
        expect(healthResultSchema.safeParse(withoutComponentField(field)).success).toBe(false);
      },
    );

    it.each([
      ['an empty code', { code: '' }],
      ['an empty name', { name: '' }],
      ['a negative latency', { latency_ms: -1 }],
      ['a latency with decimals', { latency_ms: 2.5 }],
      ['a next start that is not a date', { next_start_at: 'el lunes' }],
      ['an error that is not a text', { error: 404 }],
      ['checks that are not a list', { checks: 'database' }],
      ['a version that is not a text', { version: 2 }],
    ])('rejects a component with %s', (_label, overrides) => {
      expect(healthResultSchema.safeParse(withComponent(overrides)).success).toBe(false);
    });

    it('rejects a check without a name', () => {
      expect(
        healthResultSchema.safeParse(
          withComponent({ checks: [{ name: '', status: 'ok', latency_ms: 1, error: null }] }),
        ).success,
      ).toBe(false);
    });
  });

  it('drops the fields it does not know', () => {
    const result = healthResultSchema.parse({ ...exampleDto(), extra: true });

    expect('extra' in result).toBe(false);
  });

  it('accepts an empty list of components', () => {
    expect(healthResultSchema.parse({ ...exampleDto(), components: [] }).components).toEqual([]);
  });
});
