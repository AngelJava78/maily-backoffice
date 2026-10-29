# Modelo de datos y diseño técnico: Catálogo de módulos y acción «Ver» editable

**Feature**: `022-modules-catalog-view-action` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Entidades

Ninguna entidad nueva: `ClinicModule` (`schemas/clinicModule.ts`) ya existe desde la 021 y esta
feature no le cambia ni un campo; `SystemModule`/`ModuleActionKey` (`features/modules`) tampoco
cambian de forma. Lo que cambia es quién consume `ClinicModule` (D2) y una regla de validación de
`ModuleFormValues.actions`.

## Parte 1 — Módulos en suscripciones (US1, US3)

### Archivos que se borran

| Archivo | Por qué |
|---|---|
| `src/features/subscriptions/schemas/clinicModuleCatalog.ts` | Sin consumidores tras esta feature (research D4). |
| `src/features/subscriptions/schemas/clinicModuleCatalog.test.ts` | Prueba del archivo anterior. |

### Archivos modificados

#### `src/features/subscriptions/components/SubscriptionDetailFields.tsx`

- Deja de importar `CLINIC_MODULE_ORDER`/`ClinicModuleKey` de `../schemas/clinicModuleCatalog`; importa
  `type ClinicModule` de `../schemas/clinicModule`.
- `SubscriptionDetailFields` gana props nuevos, los mismos cuatro que `ModulesField` ya tiene desde la
  021:

  ```ts
  interface SubscriptionDetailFieldsProps {
    readonly subscription: Subscription;
    readonly modules: readonly ClinicModule[];
    readonly loading: boolean;
    readonly loadFailed: boolean;
    readonly onRetry: () => void;
  }
  ```

- El sub-componente `Modules` (interno al archivo) recibe esos mismos cuatro props en vez de solo
  `moduleKeys`, y su cuerpo pasa de recorrer `CLINIC_MODULE_ORDER` a:
  1. `loadFailed` → `ErrorState` con `onRetry` (mismos textos `subscriptions.modules.loadError.*` que
     `ModulesField` ya usa: no se crea ningún texto nuevo).
  2. `loading` → `CircularProgress aria-label={messages.common.loading}`.
  3. `modules.length === 0` → el texto `subscriptions.modules.empty` ya existente, en vez de la lista.
  4. en otro caso: separa los `moduleKeys` de la suscripción en `included`/`excluded` recorriendo
     `modules` (orden del catálogo, no `CLINIC_MODULE_ORDER`); agrega al final de `included`, por cada
     `key` de `moduleKeys` que no está en `modules`, una entrada con el propio `key` y la etiqueta
     "(no disponible)" (FR-006) — nuevo texto, `subscriptions.detail.moduleUnavailable` o similar,
     p. ej. `(key: string) => \`${key} (no disponible)\``; `excluded` (la línea "No incluye") usa solo
     `modules`, nunca incluye keys ausentes del catálogo.

#### `src/features/subscriptions/components/SubscriptionDetailPage.tsx`

- Agrega `const modulesCatalog = useClinicModulesCatalog();` junto a `useSubscription` (en paralelo,
  research D2).
- Pasa a `<SubscriptionDetailFields subscription={subscription} modules={modulesCatalog.data ?? []}
  loading={modulesCatalog.isPending} loadFailed={modulesCatalog.isError && modulesCatalog.data ===
  undefined} onRetry={() => { void modulesCatalog.refetch(); }} />`, el mismo patrón que
  `SubscriptionCreatePage` ya usa para `ModulesField` desde la 021.
- Import nuevo: `useClinicModulesCatalog` de `../hooks/useClinicModulesCatalog`.

#### `src/features/subscriptions/components/SubscriptionsComparisonTable.tsx`

- Deja de importar `CLINIC_MODULE_ORDER`; importa `type ClinicModule`.
- Props nuevos, los mismos cuatro:

  ```ts
  interface SubscriptionsComparisonTableProps {
    // ...los que ya tiene...
    readonly modules: readonly ClinicModule[];
    readonly modulesLoading: boolean;
    readonly modulesLoadFailed: boolean;
    readonly onModulesRetry: () => void;
  }
  ```

  (nombres con el prefijo `modules`/`onModules` porque el componente ya tiene un prop `cycle` y no debe
  confundirse con alguna prop futura de otra sección de la tabla).
- La fila `CLINIC_MODULE_ORDER.map((key) => <MetricRow .../>)` pasa a:
  - si `modulesLoadFailed` o `modulesLoading`: una sola `TableRow` con una celda `colSpan={columns + 1}`
    (mismo mecanismo que `SectionRow`) con `ErrorState`+reintento o `CircularProgress`, en vez de las
    filas de módulo.
  - en otro caso: `modules.map((module) => <MetricRow key={module.key} label={module.name} ... />)`,
    igual que hoy pero iterando el catálogo dinámico, con `subscription.moduleKeys.includes(module.key)`
    sin cambios.

#### `src/features/subscriptions/components/SubscriptionsListPage.tsx`

- Agrega `const modulesCatalog = useClinicModulesCatalog();`, llamado siempre (no condicionado a la
  pestaña activa, research D2).
- Pasa a `<SubscriptionsComparisonTable ... modules={modulesCatalog.data ?? []}
  modulesLoading={modulesCatalog.isPending} modulesLoadFailed={modulesCatalog.isError &&
  modulesCatalog.data === undefined} onModulesRetry={() => { void modulesCatalog.refetch(); }} />`.

#### `src/features/subscriptions/api/subscriptionErrors.ts`

- En el `switch` de `describeSubscriptionError`, el `case 'subscription_module_prerequisite_missing':`
  se borra (queda solo `case 'subscription_module_not_found':`, con el mismo cuerpo que ya tenía).

#### `src/shared/messages/es.ts`

- `subscriptions.errors.fields.moduleKeys`: pierde la cláusula "o le falta su módulo requisito" (FR-010):
  queda "Revisa los módulos incluidos: alguno no es válido."
- Nuevo texto para un `key` guardado que ya no está en el catálogo (FR-006), p. ej.
  `subscriptions.detail.moduleUnavailable: (key: string) => \`${key} (no disponible)\``.
- `subscriptions.modules.catalog`/`subscriptions.modules.requires`: se borran (FR-003, FR-008): ya
  ningún componente los usa una vez migrados el detalle y el comparativo (ModulesField y
  SubscriptionPreviewPanel ya no los usaban desde la 021).

### Simuladores de prueba

#### `src/test/handlers/subscriptionModulesCatalog.ts`

- `DEFAULT_CLINIC_MODULES` deja de derivarse de `CLINIC_MODULE_ORDER`/`messages.subscriptions.modules.
  catalog`; pasa a un arreglo literal con los 18 módulos de FR-011, por ejemplo:

  ```ts
  const DEFAULT_CLINIC_MODULES: readonly ClinicModuleDto[] = [
    { key: 'overview', name: 'Resumen', description: null, sort_order: 10 },
    { key: 'schedule', name: 'Agenda', description: null, sort_order: 20 },
    { key: 'appointments', name: 'Citas', description: null, sort_order: 30 },
    { key: 'patients', name: 'Pacientes', description: null, sort_order: 40 },
    { key: 'prescriptions', name: 'Recetas', description: null, sort_order: 50 },
    { key: 'vital_signs', name: 'Signos vitales', description: null, sort_order: 60 },
    { key: 'patient_diagnoses', name: 'Diagnósticos', description: null, sort_order: 70 },
    { key: 'templates', name: 'Plantillas', description: null, sort_order: 80 },
    { key: 'clinics', name: 'Clínicas', description: null, sort_order: 90 },
    { key: 'consulting_rooms', name: 'Consultorios', description: null, sort_order: 100 },
    { key: 'staff', name: 'Personal', description: null, sort_order: 110 },
    { key: 'finance', name: 'Finanzas', description: null, sort_order: 120 },
    { key: 'billing', name: 'Facturación', description: null, sort_order: 130 },
    { key: 'expenses', name: 'Gastos', description: null, sort_order: 140 },
    { key: 'incomes', name: 'Ingresos', description: null, sort_order: 150 },
    { key: 'services', name: 'Servicios', description: null, sort_order: 160 },
    { key: 'reports', name: 'Reportes', description: null, sort_order: 170 },
    { key: 'reminders', name: 'Recordatorios', description: null, sort_order: 180 },
  ];
  ```

  (los nombres en español exactos quedan a discreción de `/speckit-implement`, siguiendo el estilo ya
  usado por el resto del catálogo de mensajes; el orden y los `key` sí son el contrato de FR-011).
- El resto del archivo (`createClinicModulesCatalogMock`, `requests`, `setModules`, `failWith`,
  `hang`, `recover`) no cambia de forma, solo de dato inicial.

#### `src/test/handlers/subscriptionsCatalog/model.ts`

- `KNOWN_MODULE_KEYS` pasa de `new Set(CLINIC_MODULE_ORDER)` a un `Set` literal con los mismos 18 keys
  (research D6; sin `sort_order`, porque esta validación solo necesita saber si un `key` es válido).
- El bloque `for (const [dependent, prerequisite] of Object.entries(MODULE_PREREQUISITE)) { ... }`
  dentro de `normalizeModuleKeys` se borra entero, junto con el `import` de `MODULE_PREREQUISITE` y
  `CLINIC_MODULE_ORDER`.
- `normalizeModuleKeys` sigue rechazando con `subscription_module_not_found` cualquier `key` que no
  esté en `KNOWN_MODULE_KEYS` (sin cambios en ese comportamiento, FR-011).

### Pruebas existentes que requieren reescritura

| Archivo | Por qué |
|---|---|
| `SubscriptionDetailFields.test.tsx` | Props nuevos (`modules`/`loading`/`loadFailed`/`onRetry`); el harness pasa un catálogo fijo en vez de depender de `messages.subscriptions.modules.catalog`; casos nuevos de carga/error/vacío/key no disponible. |
| `SubscriptionsComparisonTable.test.tsx` | Props nuevos; la fixture de módulos ya no es `CLINIC_MODULE_ORDER`; casos nuevos de carga/error de la sección de módulos. |
| `SubscriptionDetailPage.test.tsx` | Debe registrar el mock del catálogo de módulos de clínica para que el detalle termine de cargar. |
| `src/app/router/subscriptions/subscriptionsList.integration.test.tsx` | Debe registrar el mismo mock para que el Comparativo cargue. |
| `clinicModuleCatalog.test.ts` | Se borra junto con el archivo que prueba. |
| `src/shared/messages/es.test.ts` (si existe una prueba de forma del módulo de mensajes) | Si prueba la forma de `subscriptions.errors.fields.moduleKeys` o de `subscriptions.modules.catalog`, se ajusta al texto nuevo/a su ausencia. |

### Pruebas existentes que solo necesitan ajustar el import

`OtherFeaturesField.test.tsx`, `useCreateSubscription.test.tsx`, `SubscriptionTypeField.test.tsx`,
`ClinicsLimitField.test.tsx`, `ClinicLimitsFields.test.tsx`, `SelfServiceAndTrialFields.test.tsx`:
cambian `import { REQUIRED_MODULE_KEY } from '../schemas/clinicModuleCatalog'` por
`import { REQUIRED_MODULE_KEY } from '../schemas/clinicModule'` (research D4); mismo valor literal,
ningún otro cambio.

## Parte 2 — Acción «Ver» en Módulos (US2)

### Archivos modificados

#### `src/features/modules/schemas/moduleActionCatalog.ts`

- Se borra `REQUIRED_ACTION_KEY` y su comentario (FR-018).

#### `src/features/modules/policy/moduleActionSelection.ts`

- `withActionChecked` se simplifica: deja de importar `REQUIRED_ACTION_KEY` y de tener la rama que
  ignoraba un intento de desmarcar `read`; queda un toggle plano:

  ```ts
  export function withActionChecked(
    selected: ReadonlySet<ModuleActionKey>,
    action: ModuleActionKey,
    checked: boolean,
  ): ReadonlySet<ModuleActionKey> {
    const next = new Set(selected);
    checked ? next.add(action) : next.delete(action);
    return next;
  }
  ```

#### `src/features/modules/components/ModuleFormFields.tsx`

- La casilla de cada acción pierde `disabled={action === REQUIRED_ACTION_KEY}` (FR-012): las cuatro
  quedan siempre habilitadas.
- Deja de importar `REQUIRED_ACTION_KEY`.
- Bajo el `FormGroup` de acciones, se agrega el error de grupo cuando existe, mismo idioma visual que
  ya usa cada `TextField` (`FormHelperText error`):

  ```tsx
  {errors.actions?.message !== undefined && (
    <FormHelperText error>{errors.actions.message}</FormHelperText>
  )}
  ```

#### `src/features/modules/schemas/moduleForm.ts`

- `hasRequiredAction` se borra; se agrega una función que exprese FR-015:

  ```ts
  function createUpdateDeleteRequireRead(actions: ReadonlySet<ModuleActionKey>): boolean {
    const needsRead = actions.has('write') || actions.has('update') || actions.has('delete');
    return !needsRead || actions.has('read');
  }
  ```

- El `refine` de `actions` pasa de `hasRequiredAction`/`validation.actionsReadRequired` a
  `createUpdateDeleteRequireRead`/un mensaje nuevo (FR-015): "Para usar Crear, Modificar o Eliminar,
  marca también Ver."
- Ya no hace falta ningún cambio para permitir el `Set` vacío (FR-016): basta con que el `refine`
  anterior no lo rechace, y con que no exista ningún otro `refine`/`min(1)` sobre `actions` (no lo hay
  hoy, más allá de `hasRequiredAction`).

#### `src/shared/messages/es.ts`

- `modules.validation.actionsReadRequired` se borra; se agrega
  `modules.validation.createUpdateDeleteRequireRead: 'Para usar Crear, Modificar o Eliminar, marca
  también Ver.'` (nombre exacto de la clave a discreción de `/speckit-implement`).

### Archivos que NO se tocan

`ModuleEditPanel.tsx` (la confirmación al desmarcar ya es genérica sobre cualquier acción, research
D7), `ModuleCreatePanel.tsx` (ya marca las cuatro por defecto y ya delega el toggle a
`withActionChecked`), `ModuleDangerZone.tsx`, `useCreateModule.ts`/`useUpdateModule.ts`,
`moduleErrors.ts`/`applyModuleRefusal.ts` (el error de servidor es un mecanismo distinto del `refine`
de cliente, sin relación con esta feature).

### Pruebas existentes que requieren reescritura

| Archivo | Por qué |
|---|---|
| `ModuleFormFields.test.tsx` | La prueba "shows «Ver» checked and disabled…" deja de ser cierta; agrega casos de «Ver» editable y del mensaje de grupo visible. |
| `moduleForm.test.ts` | El caso de `actions: new Set()` pasa de fallar a pasar (FR-016); se agregan casos de `write`/`update`/`delete` sin `read`. |
| `moduleActionSelection.test.ts` | El caso "never unchecks «read»" se reemplaza por uno que confirma que `read` ya se puede desmarcar como cualquier otra. |

### Pruebas de integración que ganan casos nuevos (sin reescritura de las ya existentes)

`src/app/router/modules/createModule.integration.test.tsx` y `editModule.integration.test.tsx`: casos
nuevos para los 4 escenarios de aceptación de US2 del spec (marcar «Ver» en un módulo sin permisos,
guardar sin ninguna acción, el mensaje de FR-015, la confirmación de las cuatro acciones).
