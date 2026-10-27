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

/** The fields `create` requires besides `name` and `monthly_price`, for tests that do not care. */
const REQUIRED_CREATE_FIELDS = {
  subscription_type_id: 1,
  clinics_limit: 1,
  annual_price: '0',
  consulting_rooms_limit: 0,
  doctors_limit: 0,
  assistants_limit: 0,
  new_patients_per_year_limit: 0,
};

const names = (items: readonly { readonly name: string }[]) => items.map(({ name }) => name);

describe('catalogSubscription', () => {
  it('defaults to subscription type 1 (Individual), like the real column default', () => {
    expect(catalogSubscription().subscriptionTypeId).toBe(1);
  });

  it('defaults to a clinics limit of 1, valid for the default Individual type', () => {
    expect(catalogSubscription().clinicsLimit).toBe(1);
  });
});

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

    it.each([
      [1, 'Individual'],
      [2, 'Empresarial'],
    ])('gives the DTO with the subscription type %i (%s), as a nested object', (id, name) => {
      const model = modelWith(catalogSubscription({ id: 1, subscriptionTypeId: id }));
      const [subscription] = model.list();

      expect(subscription && model.toDto(subscription).subscription_type).toEqual({ id, name });
    });

    it('gives the DTO with the clinics limit as a plain integer, not nested', () => {
      const model = modelWith(catalogSubscription({ id: 1, clinicsLimit: 40 }));
      const [subscription] = model.list();

      expect(subscription && model.toDto(subscription).clinics_limit).toBe(40);
    });
  });

  describe('create', () => {
    it('trims the texts, keeps the prices with two decimals and is born active without clinics', () => {
      const model = modelWith();

      const created = model.create({
        name: '  Pro  ',
        description: '  Para clínicas.  ',
        subscription_type_id: 1,
        clinics_limit: 1,
        monthly_price: '4500',
        annual_price: '45000',
        other_features: ['  Uno ', 'Dos'],
        consulting_rooms_limit: 2,
        doctors_limit: 3,
        assistants_limit: 1,
        new_patients_per_year_limit: 5000,
      });

      expect(created).toMatchObject({
        name: 'Pro',
        description: 'Para clínicas.',
        monthlyPrice: '4500.00',
        annualPrice: '45000.00',
        otherFeatures: ['Uno', 'Dos'],
        statusId: 1,
        clinicsCount: 0,
      });
      expect(model.find(created.id)).toEqual(created);
    });

    it.each([
      ['4500.5', '4500.50'],
      ['0', '0.00'],
      ['99999999.99', '99999999.99'],
    ])('keeps a price of %s as %s, for the monthly and the annual price alike', (price, kept) => {
      const created = modelWith().create({
        ...REQUIRED_CREATE_FIELDS,
        name: 'Pro',
        monthly_price: price,
        annual_price: price,
      });
      expect(created.monthlyPrice).toBe(kept);
      expect(created.annualPrice).toBe(kept);
    });

    it('takes an empty description as none, and no list of other features as an empty one', () => {
      const created = modelWith().create({
        name: 'Pro',
        monthly_price: '0',
        description: '   ',
        ...REQUIRED_CREATE_FIELDS,
      });

      expect(created.description).toBeNull();
      expect(created.otherFeatures).toEqual([]);
    });

    it('defaults trial_days to 0 and self_service to false when they are not sent', () => {
      const created = modelWith().create({
        name: 'Pro',
        monthly_price: '0',
        ...REQUIRED_CREATE_FIELDS,
      });

      expect(created.trialDays).toBe(0);
      expect(created.selfService).toBe(false);
    });

    it('always includes "patients", whether or not it is sent in module_keys', () => {
      expect(
        modelWith().create({ name: 'A', monthly_price: '0', ...REQUIRED_CREATE_FIELDS }).moduleKeys,
      ).toEqual(['patients']);
      expect(
        modelWith().create({
          name: 'B',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          module_keys: ['scheduling'],
        }).moduleKeys,
      ).toEqual(expect.arrayContaining(['patients', 'scheduling']));
    });

    it('refuses a module key outside the fixed catalog of nine', () => {
      const refusal = refusalOf(() =>
        modelWith().create({
          name: 'A',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          module_keys: ['facturacion'],
        }),
      );

      expect(refusal).toMatchObject({
        status: 422,
        code: 'subscription_module_not_found',
      });
    });

    it.each([
      ['reminders', 'scheduling'],
      ['clinical_record_templates', 'clinical_records'],
      ['prescriptions', 'clinical_records'],
      ['billing', 'finance'],
    ])('refuses "%s" without its prerequisite "%s"', (dependent, prerequisite) => {
      const refusal = refusalOf(() =>
        modelWith().create({
          name: 'A',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          module_keys: [dependent],
        }),
      );

      expect(refusal).toMatchObject({
        status: 409,
        code: 'subscription_module_prerequisite_missing',
      });

      expect(
        modelWith().create({
          name: 'B',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          module_keys: [dependent, prerequisite],
        }).moduleKeys,
      ).toEqual(expect.arrayContaining([dependent, prerequisite]));
    });

    it.each([1, 2])('creates with the subscription type %i, found in its own catalog', (id) => {
      const created = modelWith().create({
        name: 'A',
        monthly_price: '0',
        ...REQUIRED_CREATE_FIELDS,
        subscription_type_id: id,
      });

      expect(created.subscriptionTypeId).toBe(id);
    });

    it('refuses a subscription_type_id that is not in the catalog, discovered at creation', () => {
      const refusal = refusalOf(() =>
        modelWith().create({
          name: 'A',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          subscription_type_id: 99,
        }),
      );

      expect(refusal).toMatchObject({
        status: 422,
        code: 'subscription_type_not_found',
        message: 'No se encontró el tipo de suscripción con el identificador 99.',
      });
    });

    it('creates an Individual subscription with clinics_limit 1', () => {
      const created = modelWith().create({
        name: 'A',
        monthly_price: '0',
        ...REQUIRED_CREATE_FIELDS,
        subscription_type_id: 1,
        clinics_limit: 1,
      });

      expect(created.clinicsLimit).toBe(1);
    });

    it.each([0, 2, 100])(
      'refuses an Individual subscription with clinics_limit %i, which must be exactly 1',
      (clinicsLimit) => {
        const refusal = refusalOf(() =>
          modelWith().create({
            name: 'A',
            monthly_price: '0',
            ...REQUIRED_CREATE_FIELDS,
            subscription_type_id: 1,
            clinics_limit: clinicsLimit,
          }),
        );

        expect(refusal).toMatchObject({
          status: 422,
          code: 'validation_error',
          fieldErrors: [
            {
              field: 'clinics_limit',
              message:
                'El límite de clínicas de una suscripción Individual debe ser exactamente 1.',
            },
          ],
        });
      },
    );

    it.each([1, 50, 100])(
      'creates an Empresarial subscription with clinics_limit %i',
      (clinicsLimit) => {
        const created = modelWith().create({
          name: 'A',
          monthly_price: '0',
          ...REQUIRED_CREATE_FIELDS,
          subscription_type_id: 2,
          clinics_limit: clinicsLimit,
        });

        expect(created.clinicsLimit).toBe(clinicsLimit);
      },
    );

    it.each([0, 101])(
      'refuses an Empresarial subscription with clinics_limit %i, out of 1 to 100',
      (clinicsLimit) => {
        const refusal = refusalOf(() =>
          modelWith().create({
            name: 'A',
            monthly_price: '0',
            ...REQUIRED_CREATE_FIELDS,
            subscription_type_id: 2,
            clinics_limit: clinicsLimit,
          }),
        );

        expect(refusal).toMatchObject({
          status: 422,
          code: 'validation_error',
          fieldErrors: [
            {
              field: 'clinics_limit',
              message: 'El límite de clínicas debe ser un número entero de 1 a 100.',
            },
          ],
        });
      },
    );

    it('gives the next id and moves the dates forward', () => {
      const model = modelWith(catalogSubscription({ id: 7 }));

      const first = model.create({ name: 'A', monthly_price: '1', ...REQUIRED_CREATE_FIELDS });
      const second = model.create({ name: 'B', monthly_price: '1', ...REQUIRED_CREATE_FIELDS });

      expect([first.id, second.id]).toEqual([8, 9]);
      expect(second.createdAt > first.createdAt).toBe(true);
      expect(first.updatedAt).toBe(first.createdAt);
    });

    it.each(['pro', ' PRO ', 'Pro'])(
      'refuses the name %j, which another subscription that is not deleted uses',
      (name) => {
        const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', statusId: 3 }));

        const refusal = refusalOf(() =>
          model.create({ name, monthly_price: '1', ...REQUIRED_CREATE_FIELDS }),
        );

        expect(refusal).toMatchObject({
          status: 409,
          code: 'subscription_name_already_exists',
          message: `Ya existe una suscripción con el nombre «${name.trim()}».`,
        });
      },
    );

    it('tells the accents apart, as the API does', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Basico' }));

      expect(
        model.create({ name: 'Básico', monthly_price: '1', ...REQUIRED_CREATE_FIELDS }).name,
      ).toBe('Básico');
    });

    it('accepts the name of a deleted subscription', () => {
      const model = modelWith(catalogSubscription({ id: 1, name: 'Pro', statusId: 4 }));

      expect(
        model.create({ name: 'Pro', monthly_price: '1', ...REQUIRED_CREATE_FIELDS }).name,
      ).toBe('Pro');
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

    it('replaces the whole list of other features', () => {
      const model = modelWith(catalogSubscription({ id: 1, otherFeatures: ['Uno', 'Dos'] }));

      expect(model.update(1, { other_features: [' Tres '] }).otherFeatures).toEqual(['Tres']);
      expect(model.update(1, { other_features: [] }).otherFeatures).toEqual([]);
    });

    it('replaces the whole set of module_keys, always keeping "patients"', () => {
      const model = modelWith(catalogSubscription({ id: 1, moduleKeys: ['patients'] }));

      expect(model.update(1, { module_keys: ['scheduling'] }).moduleKeys).toEqual(
        expect.arrayContaining(['patients', 'scheduling']),
      );
    });

    it('refuses an updated module_keys that is missing a prerequisite', () => {
      const model = modelWith(catalogSubscription({ id: 1, moduleKeys: ['patients'] }));

      expect(refusalOf(() => model.update(1, { module_keys: ['reminders'] }))).toMatchObject({
        status: 409,
        code: 'subscription_module_prerequisite_missing',
      });
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

    it.each([1, 2])(
      'refuses any clinics_limit %i on an Individual subscription, changing nothing',
      (clinicsLimit) => {
        const model = modelWith(
          catalogSubscription({ id: 1, subscriptionTypeId: 1, clinicsLimit: 1, name: 'Pro' }),
        );

        const refusal = refusalOf(() =>
          model.update(1, { clinics_limit: clinicsLimit, name: 'Otro' }),
        );

        expect(refusal).toMatchObject({
          status: 422,
          code: 'validation_error',
          fieldErrors: [
            {
              field: 'clinics_limit',
              message: 'El límite de clínicas no se puede modificar en una suscripción Individual.',
            },
          ],
        });
        expect(model.find(1)).toMatchObject({ name: 'Pro', clinicsLimit: 1 });
      },
    );

    it('applies a new clinics_limit of 1 to 100 on an Empresarial subscription', () => {
      const model = modelWith(
        catalogSubscription({ id: 1, subscriptionTypeId: 2, clinicsLimit: 10 }),
      );

      expect(model.update(1, { clinics_limit: 50 }).clinicsLimit).toBe(50);
    });

    it.each([0, 101])(
      'refuses a clinics_limit of %i on an Empresarial subscription, out of 1 to 100',
      (clinicsLimit) => {
        const model = modelWith(
          catalogSubscription({ id: 1, subscriptionTypeId: 2, clinicsLimit: 10 }),
        );

        const refusal = refusalOf(() => model.update(1, { clinics_limit: clinicsLimit }));

        expect(refusal).toMatchObject({
          status: 422,
          code: 'validation_error',
          fieldErrors: [
            {
              field: 'clinics_limit',
              message: 'El límite de clínicas debe ser un número entero de 1 a 100.',
            },
          ],
        });
        expect(model.find(1)?.clinicsLimit).toBe(10);
      },
    );
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
      expect(
        model.create({ name: 'Pro', monthly_price: '1', ...REQUIRED_CREATE_FIELDS }).name,
      ).toBe('Pro');
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
