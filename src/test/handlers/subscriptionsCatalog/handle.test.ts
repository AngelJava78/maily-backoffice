import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../server';
import { createFailureControls } from '../shared/failures';
import { createRequestLog } from '../shared/requestLog';
import { ADMIN_SUB, createUsersDirectoryMock } from '../usersDirectory';
import { createAuthorization } from './authorize';
import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import { createHandle } from './handle';
import { validationError } from './model';

const PROBE = `${SUBSCRIPTIONS_API_BASE_URL}/api/v1/probe`;

/**
 * A probe operation behind the wrapper: it needs `subscriptions:write` and refuses a body without
 * `ok`, so a test can see whether the request got as far as the validation.
 */
function setup() {
  const directory = createUsersDirectoryMock();
  const log = createRequestLog(SUBSCRIPTIONS_API_BASE_URL);
  const failures = createFailureControls({ defaultCodes: new Map([[500, 'internal_error']]) });
  const authorization = createAuthorization(directory);
  const handle = createHandle({ log, failures, authorization });
  server.use(
    http.post(
      PROBE,
      handle('subscriptions:write', ({ body, sub }) => {
        if (typeof body !== 'object' || body === null || !('ok' in body)) {
          throw validationError([{ field: 'ok', message: 'Falta ok.' }]);
        }
        return HttpResponse.json({ sub });
      }),
    ),
  );
  return { directory, log, failures, authorization };
}

function send(
  body: string,
  { authorization = `Bearer test-token:${ADMIN_SUB}` }: { authorization?: string | null } = {},
) {
  return fetch(`${PROBE}?x=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization === null ? {} : { Authorization: authorization }),
    },
    body,
  });
}

async function read(response: Response) {
  const body: unknown = await response.json();
  return { status: response.status, body };
}

describe('createHandle', () => {
  it('answers the operation when everything is in order', async () => {
    setup();

    expect(await read(await send('{"ok":true}'))).toEqual({
      status: 200,
      body: { sub: ADMIN_SUB },
    });
  });

  it('refuses a body that is not readable JSON before looking at who is asking', async () => {
    setup();

    expect(await read(await send('{nope', { authorization: null }))).toEqual({
      status: 422,
      body: {
        code: 'validation_error',
        message: 'Hay datos no válidos en la solicitud.',
        errors: [{ field: 'body', message: 'El cuerpo de la solicitud no es válido.' }],
      },
    });
  });

  it('refuses a request without token, and one with a token of another format', async () => {
    setup();

    expect(await read(await send('{"ok":true}', { authorization: null }))).toMatchObject({
      status: 401,
      body: { code: 'unauthenticated', message: 'Debe iniciar sesión para usar esta operación.' },
    });
    for (const authorization of ['Basic abc', 'Bearer otro-token', 'Bearer']) {
      expect(await read(await send('{"ok":true}', { authorization }))).toMatchObject({
        status: 401,
        body: { code: 'invalid_token', message: 'El token de acceso no es válido.' },
      });
    }
  });

  it('applies an injected failure after the identity, once', async () => {
    const { failures } = setup();
    failures.controls.failNext({ status: 500, code: 'internal_error' });

    expect((await send('{"ok":true}', { authorization: null })).status).toBe(401);
    expect(await read(await send('{"ok":true}'))).toMatchObject({
      status: 500,
      body: { code: 'internal_error' },
    });
    expect((await send('{"ok":true}')).status).toBe(200);
  });

  it('refuses someone without the permission before validating the body', async () => {
    const { directory } = setup();
    directory.revoke('Administrator', 'subscriptions:write');

    expect(await read(await send('{}'))).toEqual({
      status: 403,
      body: {
        code: 'permission_denied',
        message:
          'No tiene permiso para realizar esta operación. Permiso requerido: subscriptions:write.',
      },
    });
  });

  it('takes a permission that is taken away into account from the next request', async () => {
    const { directory } = setup();

    expect((await send('{"ok":true}')).status).toBe(200);
    directory.revoke('Administrator', 'subscriptions:write');
    expect((await send('{"ok":true}')).status).toBe(403);
    directory.grant('Administrator', 'subscriptions:write');
    expect((await send('{"ok":true}')).status).toBe(200);
  });

  it('refuses someone the users service does not know', async () => {
    setup();

    expect(
      (await send('{"ok":true}', { authorization: 'Bearer test-token:auth0|nobody' })).status,
    ).toBe(403);
  });

  it('answers 503 to everyone while the permissions cannot be checked', async () => {
    const { authorization, directory } = setup();
    authorization.controls.unavailable();
    directory.revoke('Administrator', 'subscriptions:write');

    expect(await read(await send('{"ok":true}'))).toEqual({
      status: 503,
      body: {
        code: 'authorization_unavailable',
        message: 'No se pudo verificar su permiso por ahora. Inténtelo de nuevo más tarde.',
      },
    });

    authorization.controls.recover();
    expect((await send('{"ok":true}')).status).toBe(403);
  });

  it('keeps the method, the path, the search, the body and the authorization of each request', async () => {
    const { log } = setup();

    await send('{"ok":true}');

    expect(log.requests).toEqual([
      {
        method: 'POST',
        path: '/api/v1/probe',
        search: '?x=1',
        body: { ok: true },
        authorization: `Bearer test-token:${ADMIN_SUB}`,
        aborted: false,
      },
    ]);
  });
});
