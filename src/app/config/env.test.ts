import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { parseEnv } from './env';

const validSource = {
  VITE_AUTH0_DOMAIN: 'dev-angel-java.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'spa-client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: '/proxy/users',
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
        VITE_SUBSCRIPTIONS_API_URL: undefined,
        VITE_FEATURE_POSTMAN_TOKEN: false,
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

  describe.each(['VITE_CLINICS_API_URL', 'VITE_SUBSCRIPTIONS_API_URL'])('%s', (name) => {
    it('is optional, and an empty value counts as not set', () => {
      expect(parseEnv(validSource, development).ok).toBe(true);

      const result = parseEnv({ ...validSource, [name]: '' }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.env).toMatchObject({ [name]: undefined });
      }
    });

    it('follows the same rule as the users API URL', () => {
      const accepted = parseEnv({ ...validSource, [name]: 'http://127.0.0.1:8001' }, development);

      expect(accepted.ok).toBe(true);
      if (accepted.ok) {
        expect(accepted.env).toMatchObject({ [name]: 'http://127.0.0.1:8001' });
      }
      expect(errorsFor({ ...validSource, [name]: 'http://127.0.0.1:8001/' })).toEqual([
        `${name}: ${messages.config.rules.apiUrl}`,
      ]);
      expect(
        errorsFor({ ...validSource, [name]: 'http://clinics.mailysoft.com' }, production),
      ).toEqual([`${name}: ${messages.config.rules.apiUrl}`]);
    });
  });

  describe('VITE_FEATURE_POSTMAN_TOKEN', () => {
    it.each([
      ['true', true],
      ['false', false],
      [undefined, false],
      ['', false],
    ])('turns %j into %j', (value, expected) => {
      const result = parseEnv({ ...validSource, VITE_FEATURE_POSTMAN_TOKEN: value }, development);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.env.VITE_FEATURE_POSTMAN_TOKEN).toBe(expected);
      }
    });

    it.each(['TRUE', '1', 'yes', 'on'])('rejects %j', (value) => {
      expect(errorsFor({ ...validSource, VITE_FEATURE_POSTMAN_TOKEN: value })).toEqual([
        `VITE_FEATURE_POSTMAN_TOKEN: ${messages.config.rules.flag}`,
      ]);
    });
  });

  it('lists every invalid variable, in Spanish, without throwing', () => {
    const errors = errorsFor({
      ...validSource,
      VITE_AUTH0_DOMAIN: 'https://x.auth0.com',
      VITE_AUTH0_CLIENT_ID: '',
      VITE_FEATURE_POSTMAN_TOKEN: 'maybe',
    });

    expect(errors).toHaveLength(3);
    expect(errors).toEqual(
      expect.arrayContaining([
        `VITE_AUTH0_DOMAIN: ${messages.config.rules.domain}`,
        `VITE_AUTH0_CLIENT_ID: ${messages.config.rules.nonEmpty}`,
        `VITE_FEATURE_POSTMAN_TOKEN: ${messages.config.rules.flag}`,
      ]),
    );
  });

  it('does not repeat the rejected values in the messages', () => {
    const errors = errorsFor({ ...validSource, VITE_AUTH0_DOMAIN: 'https://secret-host.example' });

    expect(errors.join(' ')).not.toContain('secret-host');
  });
});
