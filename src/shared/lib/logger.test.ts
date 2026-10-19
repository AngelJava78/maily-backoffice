import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

function spyOnConsole() {
  return {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('logger', () => {
  it.each(['debug', 'info', 'warn', 'error'] as const)(
    'logger.%s writes the message and the context to the matching console method',
    (level) => {
      const spies = spyOnConsole();

      logger[level]('Something happened', { attempt: 2 });

      expect(spies[level]).toHaveBeenCalledExactlyOnceWith('Something happened', { attempt: 2 });
    },
  );

  it('writes only the message when there is no context', () => {
    const spies = spyOnConsole();

    logger.info('Plain message');

    expect(spies.info).toHaveBeenCalledExactlyOnceWith('Plain message');
  });

  it.each([
    'token',
    'access_token',
    'id_token',
    'refresh_token',
    'authorization',
    'password',
    'email',
    'name',
    'picture',
    'sub',
  ])('redacts the %s key', (key) => {
    const spies = spyOnConsole();

    logger.warn('Sensitive', { [key]: 'secret-value', harmless: 'visible' });

    expect(spies.warn).toHaveBeenCalledExactlyOnceWith('Sensitive', {
      [key]: '[redacted]',
      harmless: 'visible',
    });
  });

  it.each(['Authorization', 'EMAIL', 'accessToken', 'idToken', 'refreshToken', 'Access-Token'])(
    'redacts %s regardless of case and separators',
    (key) => {
      const spies = spyOnConsole();

      logger.error('Sensitive', { [key]: 'secret-value' });

      expect(spies.error).toHaveBeenCalledExactlyOnceWith('Sensitive', { [key]: '[redacted]' });
    },
  );

  it('redacts personal data of the user profile', () => {
    const spies = spyOnConsole();

    logger.info('Profile', {
      firstName: 'Ana',
      paternalLastName: 'Pérez',
      maternalLastName: 'Gómez',
      displayName: 'Ana Pérez',
      auth0Id: 'auth0|abc',
      cookie: 'a=b',
      secret: 's',
    });

    expect(spies.info).toHaveBeenCalledExactlyOnceWith('Profile', {
      firstName: '[redacted]',
      paternalLastName: '[redacted]',
      maternalLastName: '[redacted]',
      displayName: '[redacted]',
      auth0Id: '[redacted]',
      cookie: '[redacted]',
      secret: '[redacted]',
    });
  });

  it('redacts inside nested objects and arrays', () => {
    const spies = spyOnConsole();

    logger.error('Nested', {
      request: { headers: { authorization: 'Bearer abc', accept: 'application/json' } },
      users: [{ id: 1, email: 'ana@clinica.com' }, { id: 2 }],
    });

    expect(spies.error).toHaveBeenCalledExactlyOnceWith('Nested', {
      request: { headers: { authorization: '[redacted]', accept: 'application/json' } },
      users: [{ id: 1, email: '[redacted]' }, { id: 2 }],
    });
  });

  it('does not modify the context it receives', () => {
    spyOnConsole();
    const context = { token: 'abc', nested: { password: 'p' } };

    logger.info('Original', context);

    expect(context).toEqual({ token: 'abc', nested: { password: 'p' } });
  });

  it('turns an Error into its name and message', () => {
    const spies = spyOnConsole();

    logger.error('Render failed', { error: new TypeError('boom') });

    expect(spies.error).toHaveBeenCalledExactlyOnceWith('Render failed', {
      error: { name: 'TypeError', message: 'boom' },
    });
  });

  it('survives circular references', () => {
    const spies = spyOnConsole();
    const context: Record<string, unknown> = { id: 1 };
    context.self = context;

    logger.warn('Circular', context);

    expect(spies.warn).toHaveBeenCalledOnce();
    expect(spies.warn.mock.calls[0]?.[1]).toMatchObject({ id: 1, self: '[circular]' });
  });

  it('emits debug messages only in development', () => {
    const spies = spyOnConsole();
    vi.stubEnv('DEV', false);

    logger.debug('Only for developers');
    logger.info('Always');

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).toHaveBeenCalledOnce();

    vi.stubEnv('DEV', true);
    logger.debug('Only for developers');

    expect(spies.debug).toHaveBeenCalledOnce();
  });
});
