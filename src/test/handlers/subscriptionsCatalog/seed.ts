import { catalogSubscription, type CatalogInitial, type CatalogSubscription } from './model';

/** The creation date of the subscription with this id: one minute after the one before. */
const createdAtOf = (id: number): string => new Date(Date.UTC(2026, 9, 17, 15, id)).toISOString();

function seeded(
  id: number,
  data: Omit<Partial<CatalogSubscription>, 'id' | 'createdAt' | 'updatedAt'>,
): CatalogSubscription {
  return catalogSubscription({
    id,
    createdAt: createdAtOf(id),
    updatedAt: createdAtOf(id),
    ...data,
  });
}

/**
 * The catalog as the tests find it, with ids 1 to 7: four active subscriptions (two of them with
 * clinics, and one at $0.00), two inactive (one with clinics) and a blocked one.
 */
export function defaultCatalog(): CatalogInitial {
  return {
    subscriptions: [
      seeded(1, {
        name: 'Básico',
        monthlyPrice: '1500.00',
        features: ['1 consultorio', 'Hasta 3 usuarios', 'Agenda y pacientes'],
        clinicsCount: 2,
      }),
      seeded(2, {
        name: 'Pro',
        description: 'Para clínicas en crecimiento.',
        monthlyPrice: '4500.00',
        features: ['Hasta 5 consultorios', 'Usuarios ilimitados', 'Todo lo clínico'],
      }),
      seeded(3, {
        name: 'Premium',
        description: 'Para redes de clínicas.',
        monthlyPrice: '8900.00',
        features: ['Consultorios ilimitados', 'Todo lo de Pro'],
        clinicsCount: 1,
      }),
      seeded(4, { name: 'Enterprise', description: 'Precio a cotizar.', monthlyPrice: '0.00' }),
      seeded(5, {
        name: 'Solo',
        description: 'Para el médico que trabaja por su cuenta.',
        monthlyPrice: '900.00',
        features: ['1 consultorio', '1 usuario'],
        statusId: 2,
      }),
      seeded(6, {
        name: 'Legacy full',
        description: 'Plan histórico.',
        monthlyPrice: '0.00',
        features: ['Todo lo clínico'],
        statusId: 2,
        clinicsCount: 3,
      }),
      seeded(7, { name: 'Suspendido', monthlyPrice: '2000.00', statusId: 3 }),
    ],
  };
}

/**
 * `count` active subscriptions to fill the list: «Plan prueba 01» at $100.00, «Plan prueba 02» at
 * $200.00, and so on. Their ids start after the default catalog, unless said otherwise.
 */
export function makeSubscriptions(
  count: number,
  { firstId = 8 }: { readonly firstId?: number } = {},
): CatalogSubscription[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return seeded(firstId + index, {
      name: `Plan prueba ${String(n).padStart(2, '0')}`,
      monthlyPrice: `${n * 100}.00`,
    });
  });
}

/**
 * The test catalog of quickstart.md (step 2, with the clinics of step 3): 20 subscriptions, with
 * two at the same price (Clínica Plus and Pro) and «Plan prueba 12» in a status added by hand.
 */
export function quickstartCatalog(): CatalogInitial {
  const plans = makeSubscriptions(12, { firstId: 9 }).map((plan) =>
    plan.name === 'Plan prueba 12' ? { ...plan, statusId: 5 } : plan,
  );
  return {
    subscriptions: [
      seeded(1, {
        name: 'Básico',
        monthlyPrice: '1500.00',
        features: [
          '1 consultorio',
          'Hasta 3 usuarios',
          'Agenda y pacientes',
          'Recordatorios WhatsApp',
        ],
        clinicsCount: 2,
      }),
      seeded(2, {
        name: 'Pro',
        description: 'Para clínicas en crecimiento.',
        monthlyPrice: '4500.00',
        features: ['Hasta 5 consultorios', 'Usuarios ilimitados', 'Todo lo clínico'],
      }),
      seeded(3, {
        name: 'Clínica Plus',
        description: 'Empata en precio con Pro.',
        monthlyPrice: '4500.00',
        features: ['Hasta 3 consultorios'],
      }),
      seeded(4, {
        name: 'Premium',
        description: 'Para redes de clínicas.',
        monthlyPrice: '8900.00',
        features: ['Consultorios ilimitados', 'Todo lo de Pro'],
        clinicsCount: 1,
      }),
      seeded(5, { name: 'Enterprise', description: 'Precio a cotizar.', monthlyPrice: '0.00' }),
      seeded(6, {
        name: 'Solo',
        description: 'Para el médico que trabaja por su cuenta.',
        monthlyPrice: '900.00',
        features: ['1 consultorio', '1 usuario'],
        statusId: 2,
      }),
      seeded(7, {
        name: 'Legacy full',
        description: 'Plan histórico.',
        monthlyPrice: '0.00',
        features: ['Todo lo clínico'],
        statusId: 2,
      }),
      seeded(8, {
        name: 'Suspendido',
        description: 'Bloqueado para las pruebas.',
        monthlyPrice: '2000.00',
        statusId: 3,
      }),
      ...plans,
    ],
    statuses: [{ id: 5, name: 'En revisión' }],
  };
}
