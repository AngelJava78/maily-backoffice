/**
 * The TanStack Query keys of the clinic modules catalog (021, constitution III): written here and
 * nowhere else. A prefix of its own, distinct from `rolesModulesCatalog`: independent caches, even
 * though both ask the same real endpoint.
 */
export const clinicModuleKeys = {
  all: ['subscriptionsClinicModulesCatalog'] as const,
  catalog: () => [...clinicModuleKeys.all, 'catalog'] as const,
};
