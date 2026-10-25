import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import {
  componentFormSchema,
  newComponentFormValues,
  toCreatePayload,
  toFormValues,
  toUpdatePayload,
  type ComponentFormValues,
} from './componentForm';
import { monitoredComponentSchema } from './monitoredComponent';

const text = messages.health.registry.form;

/** The form of a new microservice, filled in, with these changes. */
function serviceValues(overrides: Partial<ComponentFormValues> = {}): ComponentFormValues {
  return {
    ...newComponentFormValues('service'),
    name: 'MailySoft Usuarios',
    code: 'mailysoft-usuarios',
    baseUrl: 'http://mailysoft-usuarios:8000',
    ...overrides,
  };
}

/** The form of a new frontend, filled in, with these changes. */
function frontendValues(overrides: Partial<ComponentFormValues> = {}): ComponentFormValues {
  return {
    ...newComponentFormValues('frontend'),
    name: 'MailySoft',
    code: 'mailysoft-web',
    baseUrl: 'https://mailysoft.example',
    livePath: '/healthz',
    ...overrides,
  };
}

/** The errors of the form, by field: the first message of each one. */
function errorsOf(values: ComponentFormValues): Record<string, string> {
  const parsed = componentFormSchema.safeParse(values);
  if (parsed.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

const REGISTERED = monitoredComponentSchema.parse({
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
});

describe('newComponentFormValues', () => {
  it('proposes the routes of the v1 contract to a microservice, enabled (FR-036)', () => {
    expect(newComponentFormValues('service')).toEqual({
      name: '',
      code: '',
      kind: 'service',
      baseUrl: '',
      livePath: '/health/live',
      readyPath: '/health/ready',
      infoPath: '/info',
      enabled: true,
      sortOrder: '',
    });
  });

  it('asks a frontend for its health route, without readiness', () => {
    expect(newComponentFormValues('frontend')).toMatchObject({
      kind: 'frontend',
      livePath: '',
      readyPath: '',
      infoPath: '',
      enabled: true,
    });
  });
});

describe('componentFormSchema', () => {
  it('accepts a microservice and a frontend filled in as they should', () => {
    expect(errorsOf(serviceValues())).toEqual({});
    expect(errorsOf(frontendValues())).toEqual({});
    expect(errorsOf(frontendValues({ infoPath: '/info' }))).toEqual({});
  });

  describe('the name: required; from 1 to 100 without counting the spaces at its ends', () => {
    it.each(['', '   '])('requires it (%j)', (name) => {
      expect(errorsOf(serviceValues({ name }))).toEqual({ name: text.required });
    });

    it('refuses 101 characters', () => {
      expect(errorsOf(serviceValues({ name: 'a'.repeat(101) }))).toEqual({ name: text.name });
    });

    it('accepts one character among spaces, and 100', () => {
      expect(errorsOf(serviceValues({ name: '  A  ' }))).toEqual({});
      expect(errorsOf(serviceValues({ name: 'a'.repeat(100) }))).toEqual({});
    });
  });

  describe('the code: from 2 to 50; lower case, digits and hyphens; starts with a letter; no hyphen at the end nor two in a row', () => {
    it.each(['ab', 'mailysoft-usuarios', 'a1-b2', 'a'.repeat(50)])('accepts %j', (code) => {
      expect(errorsOf(serviceValues({ code }))).toEqual({});
    });

    it('requires it', () => {
      expect(errorsOf(serviceValues({ code: '' }))).toEqual({ code: text.required });
    });

    it.each(['a', '1abc', 'Abc', 'ab-', 'a--b', 'águila', 'a b', '-ab', 'a'.repeat(51)])(
      'refuses %j',
      (code) => {
        expect(errorsOf(serviceValues({ code }))).toEqual({ code: text.code });
      },
    );
  });

  describe('the base URL: http or https; with a domain; no user, password, parameters (nor ?) nor fragment (nor #); up to 255', () => {
    it.each([
      'http://mailysoft-usuarios:8000',
      'https://usuarios.maily.example/base',
      'http://127.0.0.1:8001',
    ])('accepts %j', (baseUrl) => {
      expect(errorsOf(serviceValues({ baseUrl }))).toEqual({});
    });

    it('requires it', () => {
      expect(errorsOf(serviceValues({ baseUrl: '' }))).toEqual({ baseUrl: text.required });
    });

    it.each([
      'ftp://x',
      'http://',
      'http://u:p@x',
      'http://u@x',
      'http://x?',
      'http://x?a=1',
      'http://x#',
      'http://x#f',
      'http://x/a b',
      'mailysoft-usuarios:8000',
      `http://x.example/${'a'.repeat(239)}`,
    ])('refuses %j', (baseUrl) => {
      expect(errorsOf(serviceValues({ baseUrl }))).toEqual({ baseUrl: text.baseUrl });
    });

    it('accepts 255 characters', () => {
      const baseUrl = `http://x.example/${'a'.repeat(238)}`;

      expect(baseUrl).toHaveLength(255);
      expect(errorsOf(serviceValues({ baseUrl }))).toEqual({});
    });
  });

  describe('the routes: start with a single /; no \\, ?, #, %, spaces nor . or .. segments; up to 200', () => {
    it.each(['/health/live', '/healthz/', '/', `/${'a'.repeat(199)}`])('accepts %j', (livePath) => {
      expect(errorsOf(serviceValues({ livePath }))).toEqual({});
    });

    it.each([
      'health',
      '//x',
      '/a/../b',
      '/a/./b',
      '/..',
      '/a\\b',
      '/a?b',
      '/a#b',
      '/a%20b',
      '/a b',
      `/${'a'.repeat(200)}`,
    ])('refuses %j', (livePath) => {
      expect(errorsOf(serviceValues({ livePath }))).toEqual({ livePath: text.path });
    });
  });

  describe('the routes of each kind', () => {
    it('requires the three routes of a microservice', () => {
      expect(errorsOf(serviceValues({ livePath: '', readyPath: '', infoPath: '' }))).toEqual({
        livePath: text.required,
        readyPath: text.required,
        infoPath: text.required,
      });
    });

    it('requires the health route of a frontend, ignores its readiness and lets its information go', () => {
      expect(errorsOf(frontendValues({ livePath: '' }))).toEqual({ livePath: text.required });
      expect(errorsOf(frontendValues({ readyPath: 'no es una ruta', infoPath: '' }))).toEqual({});
      expect(errorsOf(frontendValues({ infoPath: 'info' }))).toEqual({ infoPath: text.path });
    });
  });

  describe('the order: optional; a whole number from 0 to 9999; empty is 0', () => {
    it.each(['', '0', '9999', ' 15 '])('accepts %j', (sortOrder) => {
      expect(errorsOf(serviceValues({ sortOrder }))).toEqual({});
    });

    it.each(['-1', '10000', '1.5', 'diez', '1e3'])('refuses %j', (sortOrder) => {
      expect(errorsOf(serviceValues({ sortOrder }))).toEqual({ sortOrder: text.sortOrder });
    });
  });
});

describe('toCreatePayload', () => {
  it('sends the whole microservice, trimmed, with the order as a number (R3)', () => {
    expect(
      toCreatePayload(serviceValues({ name: '  MailySoft Usuarios ', sortOrder: '' })),
    ).toEqual({
      code: 'mailysoft-usuarios',
      name: 'MailySoft Usuarios',
      kind: 'service',
      base_url: 'http://mailysoft-usuarios:8000',
      live_path: '/health/live',
      ready_path: '/health/ready',
      info_path: '/info',
      enabled: true,
      sort_order: 0,
    });
  });

  it('sends a frontend without readiness and, without an information route, with null', () => {
    expect(toCreatePayload(frontendValues({ readyPath: '/ignorada', sortOrder: '7' }))).toEqual({
      code: 'mailysoft-web',
      name: 'MailySoft',
      kind: 'frontend',
      base_url: 'https://mailysoft.example',
      live_path: '/healthz',
      ready_path: null,
      info_path: null,
      enabled: true,
      sort_order: 7,
    });
    expect(toCreatePayload(frontendValues({ infoPath: '/info' })).info_path).toBe('/info');
  });
});

describe('toFormValues and toUpdatePayload', () => {
  it('opens the edition with the data of the component', () => {
    expect(toFormValues(REGISTERED)).toEqual({
      name: 'MailySoft Usuarios',
      code: 'mailysoft-usuarios',
      kind: 'service',
      baseUrl: 'http://mailysoft-usuarios:8000',
      livePath: '/health/live',
      readyPath: '/health/ready',
      infoPath: '/info',
      enabled: true,
      sortOrder: '10',
    });
  });

  it('sends nothing when nothing changed (research D15)', () => {
    expect(toUpdatePayload(REGISTERED, toFormValues(REGISTERED))).toBeNull();
    expect(
      toUpdatePayload(REGISTERED, { ...toFormValues(REGISTERED), name: ' MailySoft Usuarios ' }),
    ).toBeNull();
  });

  it('sends only what changed, and never the code nor the kind (FR-037)', () => {
    expect(
      toUpdatePayload(REGISTERED, {
        ...toFormValues(REGISTERED),
        code: 'otro-codigo',
        kind: 'frontend',
        name: 'Usuarios',
        enabled: false,
        sortOrder: '',
      }),
    ).toEqual({ name: 'Usuarios', enabled: false, sort_order: 0 });
  });

  it('sends the routes and the base URL that changed', () => {
    expect(
      toUpdatePayload(REGISTERED, {
        ...toFormValues(REGISTERED),
        baseUrl: 'http://usuarios:9000',
        livePath: '/live',
        readyPath: '/ready',
        infoPath: '/version',
      }),
    ).toEqual({
      base_url: 'http://usuarios:9000',
      live_path: '/live',
      ready_path: '/ready',
      info_path: '/version',
    });
  });

  it('never sends a readiness route for a frontend, and takes its information route away with null', () => {
    const frontend = {
      ...REGISTERED,
      kind: 'frontend',
      readyPath: null,
      infoPath: '/info',
    } as const;

    expect(
      toUpdatePayload(frontend, { ...toFormValues(frontend), readyPath: '/ready', infoPath: '' }),
    ).toEqual({ info_path: null });
  });
});
