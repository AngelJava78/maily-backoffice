import { describe, expect, it } from 'vitest';

import { CatalogError, catalogSubscription, createCatalogModel } from './model';

/** The refusal an operation raises; the test fails if it does not refuse. */
function refusalOf(action: () => unknown): CatalogError {
  try {
    action();
  } catch (error) {
    if (error instanceof CatalogError) {
      return error;
    }
    throw error;
  }
  throw new Error('The operation did not refuse');
}

function modelWith(...subscriptions: ReturnType<typeof catalogSubscription>[]) {
  return createCatalogModel({ subscriptions });
}

const names = (items: readonly { readonly name: string }[]) => items.map(({ name }) => name);

describe('createCatalogModel', () => {
  describe('list and find', () => {
    it('lists what is not deleted by creation date and, on a tie, by id, also the statuses added by hand', () => {
      const model = createCatalogModel({
        subscriptions: [
          catalogSubscription({ id: 3, name: 'C', createdAt: '2026-10-02T00:00:00Z' }),
          catalogSubscription({ id: 2, name: 'B', createdAt: '2026-10-01T00:00:00Z' }),
          catalogSubscription({ id: 1, name: 'A', createdAt: '2026-10-02T00:00:00Z' }),
          catalogSubscription({ id: 4, name: 'Borrada', statusId: 4 }),
          catalogSubscription({ id: 5, name: 'En revisión', statusId: 5 }),
        ],
        statuses: [{ id: 5, name: 'En revisión' }],
      });

      expect(names(model.list())).toEqual(['B', 'A', 'C', 'En revisión']);
    });

    it('does not find a deleted subscription, nor one that does not exist', () => {
      const model = modelWith(
        catalogSubscription({ id: 1 }),
        catalogSubscription({ id: 2, name: 'Borrada', statusId: 4 }),
      );

      expect(model.find(1)?.id).toBe(1);
      expect(model.find(2)).toBeUndefined();
      expect(model.find(99)).toBeUndefined();
    });

    it('gives the DTO of the API, with the name of the status and the clinics', () => {
      const model = createCatalogModel({
        subscriptions: [catalogSubscription({ id: 7, statusId: 5, clinicsCount: 2 })],
        statuses: [{ id: 5, name: 'En revisión' }],
      });
      const [subscription] = model.list();

      expect(subscription && model.toDto(subscription)).toMatchObject({
        id: 7,
        status: { id: 5, name: 'En revisión' },
        clinics_count: 2,
      });
    });
  });

  describe('create', () => {
    it('trims the texts, keeps the price with two decimals and is born active without clinics', () => {
      const model = modelWith();

      const created = model.create({
        name: '  Pro  ',
        description: '  Para clínicas.  ',
        monthly_price: '4500',
        features: ['  Uno ', 'Dos'],
      });

      expect(created).toMatchObject({
        name: 'Pro',
        description: 'Para clínicas.',
        monthlyPrice: '4500.00',
        features: ['Uno', 'Dos'],
        statusId: 1,
        clinicsCount: 0,
      });
      expect(model.find(created.id)).toEqual(created);
    });

    it.each([
      ['4500.5', '4500.50'],
      ['0', '0.00'],
      ['99999999.99', '99999999.99'],
    ])('keeps the price %s as %s', (price, kept) => {
      expect(modelWith().create({ name: 'Pro', monthly_price: price }).monthlyPrice).toBe(kept);
    });

    it('takes an empty description as none, and no list as an empty one', () => {
      const created = modelWith().create({ name: 'Pro', description: '   ', monthly_price: '0' });

      expect(created.description).toBeNull();
      expect(created.features).toEqual([]);
    });

    it('gives the next id and moves the dates forward', () => {
      const model = modelWith(catalogSubscription({ id: 7 }));

      const first = model.create({ name: 'A', monthly_price: '1' });
      const second = model.create({ name: 'B', monthly_price: '1' });

      expect([first.id, second.id]).toEqual([8, 9]);
      expect(second.createdAt > first.createdAt).toBe(true);
      expect(first.updatedAt).toBe(first.createdAt);
    });

    it.each(['pro', ' PRO ', 'Pro'])(
      'refuses the name %j, which another subscription that is not deleted uses',
      (name) => {
        const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', statusId: 3 }));

        const refusal = refusalOf(() => model.create({ name, monthly_price: '1' }));

        expect(refusal).toMatchObject({
          status: 409,
          code: 'subscription_name_already_exists',
          message: `Ya existe una suscripción con el nombre «${name.trim()}».`,
        });
      },
    );

    it('tells the accents apart, as the API does', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Basico' }));

      expect(model.create({ name: 'Básico', monthly_price: '1' }).name).toBe('Básico');
    });

    it('accepts the name of a deleted subscription', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', statusId: 4 }));

      expect(model.create({ name: 'Pro', monthly_price: '1' }).name).toBe('Pro');
    });
  });

  describe('update', () => {
    it('changes only the data it receives and moves the modification date forward', () => {
      const original = catalogSubscription({ id: 1, name: 'Pro', description: 'Uno.' });
      const model = modelWith(original);

      const updated = model.update(1, { monthly_price: '5000' });

      expect(updated).toEqual({
        ...original,
        monthlyPrice: '5000.00',
        updatedAt: updated.updatedAt,
      });
      expect(updated.updatedAt > original.updatedAt).toBe(true);
    });

    it('lets a subscription keep its own name, even changing only the upper case', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Pro' }));

      expect(model.update(1, { name: ' pro ' }).name).toBe('pro');
    });

    it('refuses the name of another subscription that is not deleted', () => {
      const model = modelWith(
        catalogSubscription({ id: 1, name: 'Pro' }),
        catalogSubscription({ id: 2, name: 'Premium' }),
      );

      expect(refusalOf(() => model.update(2, { name: 'PRO' }))).toMatchObject({
        status: 409,
        code: 'subscription_name_already_exists',
      });
    });

    it('replaces the whole list of what it includes', () => {
      const model = modelWith(catalogSubscription({ id: 1, features: ['Uno', 'Dos'] }));

      expect(model.update(1, { features: [' Tres '] }).features).toEqual(['Tres']);
      expect(model.update(1, { features: [] }).features).toEqual([]);
    });

    it.each(['', '   ', null])('takes the description away with %j', (description) => {
      const model = modelWith(catalogSubscription({ id: 1, description: 'Algo.' }));

      expect(model.update(1, { description }).description).toBeNull();
    });

    it('refuses a subscription that is deleted or does not exist', () => {
      const model = modelWith(catalogSubscription({ id: 1, statusId: 4 }));

      for (const id of [1, 99]) {
        expect(refusalOf(() => model.update(id, { name: 'Otro' }))).toMatchObject({
          status: 404,
          code: 'subscription_not_found',
          message: `No se encontró la suscripción con el identificador ${id}.`,
        });
      }
    });
  });

  describe('changeStatus', () => {
    it.each([
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 1],
      [3, 2],
      [5, 1],
    ])('takes a subscription from %i to %i, also with clinics', (from, to) => {
      const model = createCatalogModel({
        subscriptions: [catalogSubscription({ id: 1, statusId: from, clinicsCount: 4 })],
        statuses: [{ id: 5, name: 'En revisión' }],
      });

      const changed = model.changeStatus(1, to);

      expect(changed.statusId).toBe(to);
      expect(changed.updatedAt > catalogSubscription().updatedAt).toBe(true);
    });

    it('refuses the status the subscription already has', () => {
      const model = modelWith(catalogSubscription({ id: 1, statusId: 2 }));

      expect(refusalOf(() => model.changeStatus(1, 2))).toMatchObject({
        status: 409,
        code: 'subscription_status_unchanged',
        message: 'La suscripción con el identificador 1 ya tiene el estatus Inactiva.',
      });
    });

    it.each([4, 0, 5, 99])(
      'refuses the status %i, which this operation does not admit',
      (statusId) => {
        const model = modelWith(catalogSubscription({ id: 1 }));

        expect(refusalOf(() => model.changeStatus(1, statusId))).toMatchObject({
          status: 422,
          code: 'validation_error',
          fieldErrors: [
            {
              field: 'status_id',
              message: 'El estatus debe ser uno de los que admite esta operación (1, 2 o 3).',
            },
          ],
        });
      },
    );

    it('refuses a deleted subscription', () => {
      const model = modelWith(catalogSubscription({ id: 1, statusId: 4 }));

      expect(refusalOf(() => model.changeStatus(1, 2))).toMatchObject({ status: 404 });
    });
  });

  describe('remove', () => {
    it('deletes a subscription without clinics and frees its name', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', clinicsCount: 0 }));

      model.remove(1);

      expect(model.find(1)).toBeUndefined();
      expect(model.list()).toEqual([]);
      expect(model.create({ name: 'Pro', monthly_price: '1' }).name).toBe('Pro');
    });

    it('refuses a subscription with clinics, and changes nothing', () => {
      const model = modelWith(catalogSubscription({ id: 1, clinicsCount: 1 }));

      expect(
        refusalOf(() => {
          model.remove(1);
        }),
      ).toMatchObject({
        status: 409,
        code: 'subscription_has_clinics',
        message:
          'No se puede eliminar la suscripción con el identificador 1 porque tiene clínicas asignadas.',
      });
      expect(model.find(1)?.statusId).toBe(1);
    });

    it('refuses when the clinics cannot be checked, and changes nothing', () => {
      const model = modelWith(catalogSubscription({ id: 1, clinicsCount: 0 }));
      model.setClinicsAvailable(false);

      expect(
        refusalOf(() => {
          model.remove(1);
        }),
      ).toMatchObject({
        status: 503,
        code: 'clinics_check_unavailable',
        message:
          'No se pudo comprobar si la suscripción con el identificador 1 tiene clínicas asignadas. No se eliminó; inténtelo de nuevo más tarde.',
      });
      expect(model.find(1)).toBeDefined();
    });

    it('refuses a subscription that is deleted or does not exist before checking the clinics', () => {
      const model = modelWith(catalogSubscription({ id: 1, statusId: 4 }));
      model.setClinicsAvailable(false);

      expect(
        refusalOf(() => {
          model.remove(1);
        }),
      ).toMatchObject({ status: 404 });
      expect(
        refusalOf(() => {
          model.remove(99);
        }),
      ).toMatchObject({ status: 404 });
    });
  });

  describe('clinicsCountOf', () => {
    it('gives the number of clinics, or null when they are not available', () => {
      const model = modelWith(catalogSubscription({ id: 1, clinicsCount: 3 }));

      expect(model.clinicsCountOf(1)).toBe(3);
      model.setClinicsAvailable(false);
      expect(model.clinicsCountOf(1)).toBeNull();
      expect(model.toDto(catalogSubscription({ id: 1 })).clinics_count).toBeNull();
      model.setClinicsAvailable(true);
      expect(model.clinicsCountOf(1)).toBe(3);
    });
  });

  describe('the helpers to prepare data, which apply no rule', () => {
    it('change what another person would change', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', clinicsCount: 0 }));

      model.edit(1, { monthly_price: '9000', description: 'Otra.' });
      model.setStatus(1, 3);
      model.setClinics(1, 2);

      expect(model.find(1)).toMatchObject({
        monthlyPrice: '9000.00',
        description: 'Otra.',
        statusId: 3,
        clinicsCount: 2,
      });

      model.markDeleted(1);
      expect(model.find(1)).toBeUndefined();
    });

    it('add subscriptions and statuses', () => {
      const model = modelWith();

      model.addStatus(6, 'Archivada');
      model.addSubscription(catalogSubscription({ id: 3, statusId: 6 }));

      const [added] = model.list();
      expect(added && model.toDto(added).status).toEqual({ id: 6, name: 'Archivada' });
    });
  });
});
