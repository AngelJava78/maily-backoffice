import { describe, expect, it } from 'vitest';

import { callSubscriptions } from '../../subscriptionsClient';
import { ADMIN_SUB, createUsersDirectoryMock } from '../usersDirectory';
import { createHealthMonitoringMock } from './index';

const PATH = '/api/v1/monitored-components';

/** A microservice as the Backoffice registers it. */
const USUARIOS = {
  code: 'mailysoft-usuarios',
  name: 'MailySoft Usuarios',
  kind: 'service',
  base_url: 'http://mailysoft-usuarios:8000',
  live_path: '/health/live',
  ready_path: '/health/ready',
  info_path: '/info',
  enabled: true,
  sort_order: 10,
};

function create(body: unknown) {
  return callSubscriptions(PATH, { method: 'POST', body });
}

/** The id of the component that an answer brings. */
function idOf(answer: { readonly body: unknown }): string {
  const { body } = answer;
  if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'string') {
    throw new Error('Expected a component');
  }
  return body.id;
}

describe('createHealthMonitoringMock: the registry', () => {
  it('registers a component, gives it back and lists it (R1 to R3)', async () => {
    createHealthMonitoringMock();

    const created = await create(USUARIOS);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(USUARIOS);
    expect(created.body).not.toHaveProperty('deleted_at');
    const id = idOf(created);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await callSubscriptions(`${PATH}/${id}`)).body).toMatchObject({ code: USUARIOS.code });
    expect((await callSubscriptions(PATH)).body).toEqual([created.body]);
  });

  it('lists by order and code, the disabled ones included', async () => {
    createHealthMonitoringMock();
    await create({ ...USUARIOS, code: 'zeta', sort_order: 1 });
    await create({ ...USUARIOS, code: 'alfa', sort_order: 1, enabled: false });
    await create({ ...USUARIOS, code: 'primero', sort_order: 0 });

    const list = await callSubscriptions(PATH);

    expect(list.body).toMatchObject([{ code: 'primero' }, { code: 'alfa' }, { code: 'zeta' }]);
  });

  it('modifies only what it receives, and checks the resulting component (R4)', async () => {
    createHealthMonitoringMock();
    const id = idOf(await create(USUARIOS));

    const updated = await callSubscriptions(`${PATH}/${id}`, {
      method: 'PATCH',
      body: { name: ' Usuarios ', enabled: false },
    });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Usuarios', enabled: false, code: USUARIOS.code });
    const mismatch = await callSubscriptions(`${PATH}/${id}`, {
      method: 'PATCH',
      body: { kind: 'frontend' },
    });
    expect(mismatch).toMatchObject({
      status: 422,
      body: { code: 'validation_error', errors: [{ field: 'ready_path' }] },
    });
    expect(
      (await callSubscriptions(`${PATH}/${id}`, { method: 'PATCH', body: {} })).body,
    ).toMatchObject({ errors: [{ field: 'body' }] });
  });

  it('deletes a component logically, and its code can be registered again (R5)', async () => {
    createHealthMonitoringMock();
    const id = idOf(await create(USUARIOS));

    expect((await callSubscriptions(`${PATH}/${id}`, { method: 'DELETE' })).status).toBe(204);

    expect((await callSubscriptions(`${PATH}/${id}`)).status).toBe(404);
    expect((await callSubscriptions(`${PATH}/${id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await callSubscriptions(PATH)).body).toEqual([]);
    const again = await create(USUARIOS);
    expect(again.status).toBe(201);
    expect(idOf(again)).not.toBe(id);
  });

  it('refuses invalid data field by field, and a host out of the allowed list (422)', async () => {
    const health = createHealthMonitoringMock();
    health.setAllowedHosts(['mailysoft-usuarios']);

    const invalid = await create({ ...USUARIOS, code: 'A', live_path: 'health' });
    expect(invalid).toMatchObject({
      status: 422,
      body: {
        code: 'validation_error',
        errors: [{ field: 'code' }, { field: 'live_path' }],
      },
    });
    const notAllowed = await create({ ...USUARIOS, base_url: 'http://otro-servicio:8000' });
    expect(notAllowed).toMatchObject({ status: 422, body: { errors: [{ field: 'base_url' }] } });
    expect((await create({ ...USUARIOS, kind: 'frontend' })).body).toMatchObject({
      errors: [{ field: 'ready_path' }],
    });
    expect((await create(USUARIOS)).status).toBe(201);
  });

  it('refuses a code in use or reserved (409)', async () => {
    createHealthMonitoringMock();
    await create(USUARIOS);

    for (const code of [USUARIOS.code, 'maily-system-api', 'database']) {
      expect(await create({ ...USUARIOS, code })).toMatchObject({
        status: 409,
        body: { code: 'monitored_component_code_already_exists' },
      });
    }
  });

  it('answers 404 to an id that does not exist, and 422 to one that is not an id', async () => {
    createHealthMonitoringMock();

    expect((await callSubscriptions(`${PATH}/3f1c2a4e-8b7d-4c6e-9a5f-1b2c3d4e5f60`)).status).toBe(
      404,
    );
    expect((await callSubscriptions(`${PATH}/42`)).body).toMatchObject({
      errors: [{ field: 'component_id' }],
    });
  });

  it('asks the users service for the permission of each operation (403)', async () => {
    const directory = createUsersDirectoryMock();
    createHealthMonitoringMock({ directory });
    const asAdmin = { sub: ADMIN_SUB };

    expect((await callSubscriptions(PATH, asAdmin)).status).toBe(403);
    directory.grant('Administrator', 'health:read');
    expect((await callSubscriptions(PATH, asAdmin)).status).toBe(200);
    expect(
      (await callSubscriptions(PATH, { ...asAdmin, method: 'POST', body: USUARIOS })).status,
    ).toBe(403);
    directory.grant('Administrator', 'health:write');
    const created = await callSubscriptions(PATH, { ...asAdmin, method: 'POST', body: USUARIOS });
    expect(created.status).toBe(201);
    const id = idOf(created);
    expect(
      (
        await callSubscriptions(`${PATH}/${id}`, {
          ...asAdmin,
          method: 'PATCH',
          body: { name: 'X' },
        })
      ).status,
    ).toBe(403);
    expect(
      (await callSubscriptions(`${PATH}/${id}`, { ...asAdmin, method: 'DELETE' })).status,
    ).toBe(403);
  });

  it('shows the enabled components in the result of the aggregator, and not the disabled ones', async () => {
    createHealthMonitoringMock();
    const id = idOf(await create(USUARIOS));
    await create({ ...USUARIOS, code: 'apagado', enabled: false });

    expect((await callSubscriptions('/api/v1/health')).body).toMatchObject({
      components: [{ code: 'maily-system-api' }, { code: 'database' }, { code: USUARIOS.code }],
    });

    await callSubscriptions(`${PATH}/${id}`, { method: 'PATCH', body: { enabled: false } });

    expect((await callSubscriptions('/api/v1/health')).body).toMatchObject({
      components: [{ code: 'maily-system-api' }, { code: 'database' }],
    });
  });

  it('lets a test delete a component behind the scenes, as another person would', async () => {
    const health = createHealthMonitoringMock();
    const id = idOf(await create(USUARIOS));

    health.removeBehindTheScenes(id);

    expect((await callSubscriptions(`${PATH}/${id}`)).status).toBe(404);
    expect(health.registered().map((component) => component.code)).toEqual([]);
  });
});
