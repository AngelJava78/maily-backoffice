import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { parseEnv } from './env';

const validSource = {
  VITE_AUTH0_DOMAIN: 'dev-angel-java.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'spa-client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: '/proxy/users',
  VITE_SUBSCRIPTIONS_API_URL: '/proxy/subscriptions',
};

const development = { isProduction: false };
const production = { isProduction: true };

function without(source: Readonly<Record<string, string>>, name: string): Record<string, string> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => key !== name));
}

function errorsFor(
  source: Readonly<Record<string, unknown>>,
  options: { readonly isProduction: boolean } = development,
): readonly string[] {
  const result = parseEnv(source, options);
  if (result.ok) {
    throw new Error('Expected the environment to be rejected');
  }
  return result.errors;
}

describe('parseEnv', () => {
  it('accepts the minimal configuration and applies the defaults', () => {
    expect(parseEnv(validSource, development)).toEqual({
      ok: true,
      env: {
        ...validSource,
        VITE_CLINICS_API_URL: undefined,
        VITE_DASHBOARD_REFRESH_MINUTES: 5,
        VITE_MAILYSOFT_APP_URL: undefined,
        VITE_HEALTH_REFRESH_SECONDS: 30,
        VITE_HEALTH_DIRECT_SERVICES: [],
      },
    });
  });

  it('ignores variables that are not part of the contract', () => {
    const result = parseEnv(
      { ...validSource, BASE_URL: '/', MODE: 'test', DEV: true, SOMETHING_ELSE: 'x' },
      development,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.env)).not.toContain('MODE');
      expect(Object.keys(result.env)).not.toContain('SOMETHING_ELSE');
    }
  });

  describe('VITE_AUTH0_DOMAIN', () => {
    it.each(['dev-angel-java.us.auth0.com', 'login.mailysoft.com', 'DEV-X.US.AUTH0.COM'])(
      'accepts the domain name %s',
      (domain) => {
        expect(parseEnv({ ...validSource, VITE_AUTH0_DOMAIN: domain }, development).ok).toBe(true);
      },
    );

    it.each([
      'https://x.auth0.com',
      'http://x.auth0.com',
      'x.auth0.com/',
      'x.auth0.com/path',
      'x.auth0.com:443',
      'x',
      'a b.auth0.com',
      '-x.auth0.com',
      '',
      '   ',
    ])('rejects %j', (domain) => {
      expect(errorsFor({ ...validSource, VITE_AUTH0_DOMAIN: domain })).toEqual([
        `VITE_AUTH0_DOMAIN: ${messages.config.rules.domain}`,
      ]);
    });

    it('rejects a missing domain', () => {
      expect(errorsFor(without(validSource, 'VITE_AUTH0_DOMAIN'))).toEqual([
        `VITE_AUTH0_DOMAIN: ${messages.config.rules.domain}`,
      ]);
    });
  });

  describe('VITE_AUTH0_CLIENT_ID and VITE_AUTH0_AUDIENCE', () => {
    it.each([undefined, '', '   '])('rejects the client id %j', (clientId) => {
      expect(errorsFor({ ...validSource, VITE_AUTH0_CLIENT_ID: clientId })).toEqual([
        `VITE_AUTH0_CLIENT_ID: ${messages.config.rules.nonEmpty}`,
      ]);
    });

    it.each([undefined, '', '   '])('rejects the audience %j', (audience) => {
      expect(errorsFor({ ...validSource, VITE_AUTH0_AUDIENCE: audience })).toEqual([
        `VITE_AUTH0_AUDIENCE: ${messages.config.rules.audience}`,
      ]);
    });
  });

  describe('VITE_USERS_API_URL', () => {
    it.each(['/proxy/users', 'http://127.0.0.1:8000', 'https://users.mailysoft.com', '/api'])(
      'accepts %s in development',
      (url) => {
        expect(parseEnv({ ...validSource, VITE_USERS_API_URL: url }, development).ok).toBe(true);
      },
    );

    it.each([
      'https://x/',
      '/proxy/users/',
      '/',
      '',
      'proxy/users',
      '//evil.example.com',
      'ftp://users.mailysoft.com',
      'users.mailysoft.com',
      'javascript:alert(1)',
      'https://',
      // A browser reads a backslash as a slash: these would send the token to evil.example.com.
      '/\\evil.example.com',
      'https://good.example.com\\@evil.example.com',
      '/proxy\\users',
      // Whitespace and control characters have no place in a base URL.
      ' /proxy/users',
      '/proxy/users ',
      '/proxy/ users',
      'https://users.mailysoft.com\t',
    ])('rejects %j', (url) => {
      expect(errorsFor({ ...validSource, VITE_USERS_API_URL: url })).toEqual([
        `VITE_USERS_API_URL: ${messages.config.rules.apiUrl}`,
      ]);
    });

    it('rejects a missing users API URL', () => {
      expect(errorsFor(without(validSource, 'VITE_USERS_API_URL'))).toEqual([
        `VITE_USERS_API_URL: ${messages.config.rules.apiUrl}`,
      ]);
    });

    it('requires https for absolute URLs in production builds', () => {
      expect(
        errorsFor({ ...validSource, VITE_USERS_API_URL: 'http://users.mailysoft.com' }, production),
      ).toEqual([`VITE_USERS_API_URL: ${messages.config.rules.apiUrl}`]);
      expect(
        errorsFor({ ...validSource, VITE_USERS_API_URL: 'http://127.0.0.1:8000' }, production),
      ).toEqual([`VITE_USERS_API_URL: ${messages.config.rules.apiUrl}`]);
    });

    it('keeps accepting https URLs and same-origin paths in production builds', () => {
      expect(
        parseEnv({ ...validSource, VITE_USERS_API_URL: 'https://users.mailysoft.com' }, production)
          .ok,
      ).toBe(true);
      expect(parseEnv(validSource, production).ok).toBe(true);
    });
  });

  // The subscriptions section needs its API (feature 003, research D13): without it nothing works.
  describe('VITE_SUBSCRIPTIONS_API_URL', () => {
    it.each(['/proxy/subscriptions', 'http://127.0.0.1:8010', 'https://plans.mailysoft.com'])(
      'accepts %s in development',
      (url) => {
        expect(parseEnv({ ...validSource, VITE_SUBSCRIPTIONS_API_URL: url }, development).ok).toBe(
          true,
        );
      },
    );

    it('is required: a missing value is rejected', () => {
      expect(errorsFor(without(validSource, 'VITE_SUBSCRIPTIONS_API_URL'))).toEqual([
        `VITE_SUBSCRIPTIONS_API_URL: ${messages.config.rules.apiUrl}`,
      ]);
    });

    it('is required: an empty value is rejected, not taken as unset', () => {
      expect(errorsFor({ ...validSource, VITE_SUBSCRIPTIONS_API_URL: '' })).toEqual([
        `VITE_SUBSCRIPTIONS_API_URL: ${messages.config.rules.apiUrl}`,
      ]);
    });

    it('follows the same rule as the users API URL', () => {
      expect(
        errorsFor({ ...validSource, VITE_SUBSCRIPTIONS_API_URL: '/proxy/subscriptions/' }),
      ).toEqual([`VITE_SUBSCRIPTIONS_API_URL: ${messages.config.rules.apiUrl}`]);
      expect(
        errorsFor(
          { ...validSource, VITE_SUBSCRIPTIONS_API_URL: 'http://plans.mailysoft.com' },
          production,
        ),
      ).toEqual([`VITE_SUBSCRIPTIONS_API_URL: ${messages.config.rules.apiUrl}`]);
      expect(parseEnv(validSource, production).ok).toBe(true);
    });
  });

  describe('VITE_CLINICS_API_URL', () => {
    it('is optional, and an empty value counts as not set', () => {
      expect(parseEnv(validSource, development).ok).toBe(true);

      const result = parseEnv({ ...validSource, VITE_CLINICS_API_URL: '' }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.env).toMatchObject({ VITE_CLINICS_API_URL: undefined });
      }
    });

    it('follows the same rule as the users API URL', () => {
      const accepted = parseEnv(
        { ...validSource, VITE_CLINICS_API_URL: 'http://127.0.0.1:8001' },
        development,
      );

      expect(accepted.ok).toBe(true);
      if (accepted.ok) {
        expect(accepted.env).toMatchObject({ VITE_CLINICS_API_URL: 'http://127.0.0.1:8001' });
      }
      expect(errorsFor({ ...validSource, VITE_CLINICS_API_URL: 'http://127.0.0.1:8001/' })).toEqual(
        [`VITE_CLINICS_API_URL: ${messages.config.rules.apiUrl}`],
      );
      expect(
        errorsFor(
          { ...validSource, VITE_CLINICS_API_URL: 'http://clinics.mailysoft.com' },
          production,
        ),
      ).toEqual([`VITE_CLINICS_API_URL: ${messages.config.rules.apiUrl}`]);
    });
  });

  // How often the Panel refreshes itself (feature 007, contracts/environment.md): whole minutes from
  // 1 to 60, written with digits only, and 5 when it is not set.
  describe('VITE_DASHBOARD_REFRESH_MINUTES', () => {
    function refreshMinutesOf(value: string | undefined): number {
      const source =
        value === undefined
          ? validSource
          : { ...validSource, VITE_DASHBOARD_REFRESH_MINUTES: value };
      const result = parseEnv(source, development);
      if (!result.ok) {
        throw new Error(`Expected ${JSON.stringify(value)} to be accepted`);
      }
      return result.env.VITE_DASHBOARD_REFRESH_MINUTES;
    }

    it('is 5 when it is not set, or set to an empty value', () => {
      expect(refreshMinutesOf(undefined)).toBe(5);
      expect(refreshMinutesOf('')).toBe(5);
    });

    it.each([
      ['1', 1],
      ['5', 5],
      ['05', 5],
      ['30', 30],
      ['60', 60],
    ])('reads %j as %d minutes', (value, minutes) => {
      expect(refreshMinutesOf(value)).toBe(minutes);
    });

    it.each(['0', '61', '999', '2.5', '5.0', '1e1', 'cinco', '+5', '-5', ' 5', '5 ', '   '])(
      // The whole message is the name and the rule, so the value received never shows up in it.
      'rejects %j with the rule and without repeating the value',
      (value) => {
        expect(errorsFor({ ...validSource, VITE_DASHBOARD_REFRESH_MINUTES: value })).toEqual([
          `VITE_DASHBOARD_REFRESH_MINUTES: ${messages.config.rules.refreshMinutes}`,
        ]);
      },
    );
  });

  // How often the page "Salud de servicios" refreshes itself (feature 016, contracts/environment.md):
  // whole seconds from 10 to 300, written with digits only, and 30 when it is not set.
  describe('VITE_HEALTH_REFRESH_SECONDS', () => {
    function refreshSecondsOf(value: string | undefined): number {
      const source =
        value === undefined ? validSource : { ...validSource, VITE_HEALTH_REFRESH_SECONDS: value };
      const result = parseEnv(source, development);
      if (!result.ok) {
        throw new Error(`Expected ${JSON.stringify(value)} to be accepted`);
      }
      return result.env.VITE_HEALTH_REFRESH_SECONDS;
    }

    it('is 30 when it is not set, or set to an empty value', () => {
      expect(refreshSecondsOf(undefined)).toBe(30);
      expect(refreshSecondsOf('')).toBe(30);
    });

    it.each([
      ['10', 10],
      ['030', 30],
      ['300', 300],
    ])('reads %j as %d seconds, a number', (value, seconds) => {
      expect(refreshSecondsOf(value)).toBe(seconds);
    });

    it.each(['9', '301', '30.5', '+30', '-30', '3e1', 'treinta', ' 30', '30 ', '   '])(
      // The whole message is the name and the rule, so the value received never shows up in it.
      'rejects %j with the rule and without repeating the value',
      (value) => {
        expect(errorsFor({ ...validSource, VITE_HEALTH_REFRESH_SECONDS: value })).toEqual([
          `VITE_HEALTH_REFRESH_SECONDS: ${messages.config.rules.healthRefreshSeconds}`,
        ]);
      },
    );
  });

  // The services that the direct check of «Salud de servicios» reaches besides the two of the
  // platform (feature 016, contracts/environment.md): a JSON list, and [] when it is not set.
  describe('VITE_HEALTH_DIRECT_SERVICES', () => {
    const PATIENTS = {
      code: 'mailysoft-pacientes',
      name: 'mailySoft-pacientes',
      url: 'https://pacientes.maily.example',
    };
    const rule = `VITE_HEALTH_DIRECT_SERVICES: ${messages.config.rules.healthDirectServices}`;

    function servicesOf(value: string | undefined, options = development) {
      const source =
        value === undefined ? validSource : { ...validSource, VITE_HEALTH_DIRECT_SERVICES: value };
      const result = parseEnv(source, options);
      if (!result.ok) {
        throw new Error(`Expected ${JSON.stringify(value)} to be accepted`);
      }
      return result.env.VITE_HEALTH_DIRECT_SERVICES;
    }

    it.each([undefined, '', '[]'])('is an empty list for %j', (value) => {
      expect(servicesOf(value)).toEqual([]);
    });

    it('reads the services, in order, with the name trimmed', () => {
      expect(
        servicesOf(
          JSON.stringify([
            PATIENTS,
            { code: 'mailysoft-agenda', name: '  Agenda  ', url: '/proxy/agenda' },
          ]),
          production,
        ),
      ).toEqual([PATIENTS, { code: 'mailysoft-agenda', name: 'Agenda', url: '/proxy/agenda' }]);
    });

    it('accepts 20 services', () => {
      const twenty = Array.from({ length: 20 }, (_, index) => ({
        ...PATIENTS,
        code: `servicio-${String(index + 1)}`,
      }));

      expect(servicesOf(JSON.stringify(twenty))).toHaveLength(20);
    });

    it.each([
      ['a text that is not JSON', 'no es json'],
      ['an object', '{}'],
      ['only spaces', '   '],
      ['a service without url', JSON.stringify([{ code: 'a1', name: 'A' }])],
      ['a service with one more field', JSON.stringify([{ ...PATIENTS, port: 8000 }])],
      ['a code with upper case', JSON.stringify([{ ...PATIENTS, code: 'Pacientes' }])],
      ['a code of one character', JSON.stringify([{ ...PATIENTS, code: 'a' }])],
      ['a repeated code', JSON.stringify([PATIENTS, PATIENTS])],
      ['the code of maily-system-api', JSON.stringify([{ ...PATIENTS, code: 'maily-system-api' }])],
      [
        'the code of mailySoft-usuarios',
        JSON.stringify([{ ...PATIENTS, code: 'mailysoft-usuarios' }]),
      ],
      ['an empty name', JSON.stringify([{ ...PATIENTS, name: '   ' }])],
      ['a name of 101 characters', JSON.stringify([{ ...PATIENTS, name: 'a'.repeat(101) }])],
      [
        'a URL with a slash at the end',
        JSON.stringify([{ ...PATIENTS, url: 'https://x.example/' }]),
      ],
      ['a URL with parameters', JSON.stringify([{ ...PATIENTS, url: 'https://x.example?x=1' }])],
      ['a URL with a fragment', JSON.stringify([{ ...PATIENTS, url: 'https://x.example#f' }])],
      [
        '21 services',
        JSON.stringify(
          Array.from({ length: 21 }, (_, index) => ({
            ...PATIENTS,
            code: `s-${String(index + 1)}`,
          })),
        ),
      ],
    ])('rejects %s with the rule and without repeating the value', (_label, value) => {
      const errors = errorsFor({ ...validSource, VITE_HEALTH_DIRECT_SERVICES: value });

      expect(errors).toEqual([rule]);
      expect(errors.join(' ')).not.toContain(value);
    });

    it('rejects a URL http in a production build', () => {
      expect(
        errorsFor(
          {
            ...validSource,
            VITE_HEALTH_DIRECT_SERVICES: JSON.stringify([{ ...PATIENTS, url: 'http://x.example' }]),
          },
          production,
        ),
      ).toEqual([rule]);
    });
  });

  // The link to MailySoft's clinic-facing application on the "Sin acceso" page (feature 006,
  // FR-015): optional, and — unlike VITE_CLINICS_API_URL — not a base the client sends a token
  // to, so a trailing slash, a path, a query or a fragment are all accepted.
  describe('VITE_MAILYSOFT_APP_URL', () => {
    it('is optional, and an empty value counts as not set', () => {
      expect(parseEnv(validSource, development).ok).toBe(true);

      const result = parseEnv({ ...validSource, VITE_MAILYSOFT_APP_URL: '' }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.env).toMatchObject({ VITE_MAILYSOFT_APP_URL: undefined });
      }
    });

    it.each([
      'https://clinicas.mailysoft.example',
      'http://127.0.0.1:4000',
      // Unlike an API base: a trailing slash, a path, a query and a fragment are all fine here.
      'https://clinicas.mailysoft.example/',
      'https://clinicas.mailysoft.example/entrar?ref=backoffice#top',
    ])('accepts %s in development', (url) => {
      const result = parseEnv({ ...validSource, VITE_MAILYSOFT_APP_URL: url }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.env).toMatchObject({ VITE_MAILYSOFT_APP_URL: url });
      }
    });

    it.each([
      'no es una url',
      'ftp://clinicas.mailysoft.example',
      ' https://x.com',
      'https:/\\x.com',
    ])('rejects %j', (url) => {
      expect(errorsFor({ ...validSource, VITE_MAILYSOFT_APP_URL: url })).toEqual([
        `VITE_MAILYSOFT_APP_URL: ${messages.config.rules.mailySoftAppUrl}`,
      ]);
    });

    it('requires https for an absolute URL in production builds', () => {
      expect(
        errorsFor(
          { ...validSource, VITE_MAILYSOFT_APP_URL: 'http://clinicas.mailysoft.example' },
          production,
        ),
      ).toEqual([`VITE_MAILYSOFT_APP_URL: ${messages.config.rules.mailySoftAppUrl}`]);
    });
  });

  describe('VITE_FEATURE_POSTMAN_TOKEN, which feature 005 removed', () => {
    // The Token tool depends on the permission `token:read`, not on the environment (FR-006): a
    // line that is left in a local `.env` is one more variable the contract does not know.
    it.each(['true', 'false', 'maybe', ''])('ignores the value %j', (value) => {
      const result = parseEnv({ ...validSource, VITE_FEATURE_POSTMAN_TOKEN: value }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect('VITE_FEATURE_POSTMAN_TOKEN' in result.env).toBe(false);
      }
    });
  });

  it('lists every invalid variable, in Spanish, without throwing', () => {
    const errors = errorsFor({
      ...validSource,
      VITE_AUTH0_DOMAIN: 'https://x.auth0.com',
      VITE_AUTH0_CLIENT_ID: '',
    });

    expect(errors).toHaveLength(2);
    expect(errors).toEqual(
      expect.arrayContaining([
        `VITE_AUTH0_DOMAIN: ${messages.config.rules.domain}`,
        `VITE_AUTH0_CLIENT_ID: ${messages.config.rules.nonEmpty}`,
      ]),
    );
  });

  it('does not repeat the rejected values in the messages', () => {
    const errors = errorsFor({ ...validSource, VITE_AUTH0_DOMAIN: 'https://secret-host.example' });

    expect(errors.join(' ')).not.toContain('secret-host');
  });
});
