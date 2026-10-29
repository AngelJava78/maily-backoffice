# Modelo de datos y diseño técnico: Catálogo dinámico de módulos de clínica

**Feature**: `021-dynamic-clinic-modules` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Entidades

### `ClinicModule` (nueva, `schemas/clinicModule.ts`)

Un módulo de clínica activo tal como lo devuelve `GET /api/v1/modules?type_id=2&status_id=1`
(contrato: [../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md)).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `key` | `string`, `^[a-z][a-z0-9_]*$` | `key` | Identidad estable del módulo; es lo único que se envía al guardar la suscripción (FR-006). |
| `name` | `string`, máx. 100 | `name` | Nombre que se muestra en la casilla (FR-004). |
| `description` | `string \| null`, máx. 500 | `description` | Descripción que se muestra bajo el nombre (FR-004). |
| `sortOrder` | `number` entero | `sort_order` | No se reordena en el cliente: el contrato ya garantiza el orden («ordenado por `sort_order`, luego `name`»); se conserva solo como dato, no para volver a ordenar (FR-003, edge case de empates). |

`id`, `created_at`, `status` y `type` del DTO real se descartan al parsear (Zod ignora claves no
declaradas): ninguno se usa en esta feature (research D2). `status`/`type` ya están filtrados por los
parámetros `status_id=1`/`type_id=2` de la propia solicitud.

```ts
export const clinicModuleSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable(),
    sort_order: z.number().int(),
  })
  .transform((dto) => ({
    key: dto.key,
    name: dto.name,
    description: dto.description,
    sortOrder: dto.sort_order,
  }));

export type ClinicModule = z.output<typeof clinicModuleSchema>;
export const clinicModulesSchema = z.array(clinicModuleSchema);

/** La única key con trato especial (Clarifications): siempre marcada, nunca removible. */
export const REQUIRED_MODULE_KEY = 'patients';
```

`REQUIRED_MODULE_KEY` se declara aquí, no se reexporta de `schemas/clinicModuleCatalog.ts`: ambos
archivos coexisten con el mismo valor literal (`'patients'`) para su propio consumidor (research D3);
no hay una única fuente compartida porque el catálogo fijo seguirá existiendo por su cuenta para el
Comparativo, el detalle y el simulador de Suscripciones, ajenos a esta feature.

### `SubscriptionFormValues.moduleKeys` (cambia de tipo, `schemas/subscriptionForm.ts`)

Pasa de `ReadonlySet<ClinicModuleKey>` (unión cerrada de nueve keys) a `ReadonlySet<string>`: las keys
ya no son un catálogo fijo conocido en tiempo de compilación.

```ts
const moduleKeysSchema = z.custom<ReadonlySet<string>>((value) => value instanceof Set);
```

`CreateSubscriptionBody.module_keys`/`UpdateSubscriptionBody.module_keys` ya eran `readonly string[]`:
sin cambios.

## Archivos nuevos

### `src/features/subscriptions/schemas/clinicModule.ts` (+ `.test.ts`)

El esquema de arriba. Prueba: parseo del DTO real (con y sin `description`), rechazo de una key con
formato inválido, que los campos no declarados del DTO (p. ej. `active_permissions_count`) no
aparecen en el resultado.

### `src/features/subscriptions/api/clinicModulesApi.ts` (+ `.test.ts`)

```ts
export const CLINIC_MODULES_PATH = '/api/v1/modules';
const CLINIC_MODULE_TYPE_ID = 2;
const ACTIVE_STATUS_ID = 1;

/** Los módulos de clínica activos (FR-001, FR-002), en el orden que da la API. */
export function listClinicModules(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<ClinicModule[]> {
  return client.get(CLINIC_MODULES_PATH, {
    schema: clinicModulesSchema,
    query: { type_id: CLINIC_MODULE_TYPE_ID, status_id: ACTIVE_STATUS_ID },
    signal,
  });
}
```

Prueba (mismo patrón que `features/roles/api/modulesApi.test.ts`): registra un handler inline con
`server.use(http.get(usersUrl('/api/v1/modules'), ...))`, confirma que la query string enviada es
exactamente `?type_id=2&status_id=1` y que el DTO se convierte a camelCase.

### `src/features/subscriptions/hooks/clinicModuleKeys.ts` (+ `.test.ts`, breve)

```ts
export const clinicModuleKeys = {
  all: ['subscriptionsClinicModulesCatalog'] as const,
  catalog: () => [...clinicModuleKeys.all, 'catalog'] as const,
};
```

Prefijo distinto del de `roles` (`rolesModulesCatalog`): son cachés independientes, sin ninguna razón
para compartir clave aunque pidan el mismo endpoint real.

### `src/features/subscriptions/hooks/useClinicModulesCatalog.ts` (+ `.test.tsx`)

```ts
const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/** El catálogo vigente de módulos de clínica activos (FR-001, FR-002); se pide una vez por pantalla
 * (Assumptions: no hace falta refrescarlo mientras el formulario sigue abierto). */
export function useClinicModulesCatalog(): UseQueryResult<ClinicModule[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: clinicModuleKeys.catalog(),
    queryFn: ({ signal }) => listClinicModules(users, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
```

Sin `enabled`: a diferencia de `useRolesCatalog`, las dos pantallas que usan este hook (alta y edición)
siempre necesitan el catálogo, así que se pide siempre.

### `src/features/subscriptions/policy/clinicModuleSelection.ts` (+ `.test.ts`)

Reemplaza a `policy/moduleSelection.ts` (que se borra, research D3).

```ts
/**
 * Los módulos realmente usables: solo keys presentes en el catálogo vigente (FR-005, FR-009), con
 * `patients` siempre incluida si el catálogo la trae (FR-007), sin importar si `selected` ya la
 * tenía. Se usa tanto para decidir qué aparece marcado (ModulesField, SubscriptionPreviewPanel) como,
 * justo antes de guardar, para decidir qué se envía (research D4).
 */
export function resolveModuleSelection(
  selected: ReadonlySet<string>,
  catalog: readonly ClinicModule[],
): ReadonlySet<string> {
  const catalogKeys = new Set(catalog.map((module) => module.key));
  const kept = new Set([...selected].filter((key) => catalogKeys.has(key)));
  if (catalogKeys.has(REQUIRED_MODULE_KEY)) {
    kept.add(REQUIRED_MODULE_KEY);
  }
  return kept;
}
```

Pruebas: quita una key ausente del catálogo; agrega `patients` aunque no estuviera en `selected`; no la
agrega si el catálogo no la trae (edge case); es pura (no muta `selected`); con el catálogo vacío,
devuelve un conjunto vacío.

### `src/test/handlers/subscriptionModulesCatalog.ts` (sin prueba propia, es infraestructura de prueba)

```ts
export const DEFAULT_CLINIC_MODULES: readonly ClinicModuleDto[] = CLINIC_MODULE_ORDER.map(
  (key, index) => ({
    key,
    name: messages.subscriptions.modules.catalog[key].name,
    description: messages.subscriptions.modules.catalog[key].description,
    sort_order: (index + 1) * 10,
  }),
);

export function createClinicModulesCatalogMock(initial = DEFAULT_CLINIC_MODULES) {
  // normal / failWith(status, code) / hang() / recover(), requests[] grabadas — mismo patrón que
  // createUsersServiceMock (research D10).
}
```

Se registra junto a `createSubscriptionsCatalogMock()` en toda prueba que monte
`SubscriptionCreatePage`/`SubscriptionEditPage`/el router completo.

## Archivos que se borran

| Archivo | Por qué |
|---|---|
| `src/features/subscriptions/policy/moduleSelection.ts` + `.test.ts` | Único consumidor (`ModulesField`) deja de usarlo; la cascada de dependencias se retira (Clarifications). |

## Archivos que NO se tocan (research D3)

`src/features/subscriptions/schemas/clinicModuleCatalog.ts` (+ `.test.ts`),
`SubscriptionsComparisonTable.tsx`, `SubscriptionDetailFields.tsx` y
`src/test/handlers/subscriptionsCatalog/model.ts` siguen exactamente igual: siguen siendo la fuente
del Comparativo, el detalle y la validación simulada del backend.

## Archivos modificados

### `src/features/subscriptions/schemas/subscriptionForm.ts`

- `moduleKeysSchema`: `ReadonlySet<ClinicModuleKey>` → `ReadonlySet<string>` (ver arriba).
- Se quita el import de `CLINIC_MODULE_ORDER`/`ClinicModuleKey` de `./clinicModuleCatalog`.
- `toFormValues`: se quita el filtro `knownKeys`/`CLINIC_MODULE_ORDER`; queda
  `moduleKeys: new Set(subscription.moduleKeys)` (research D7: el filtrado contra el catálogo vigente
  ya no es responsabilidad de esta función pura).
- `toCreateSubscriptionBody`/`toUpdateSubscriptionBody`: **sin cambios de firma ni de cuerpo**
  (research D11).

### `src/features/subscriptions/components/ModulesField.tsx`

Nuevos props, además de los que ya tiene (`control`, `errors`):

```ts
interface ModulesFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
  readonly modules: readonly ClinicModule[];
  readonly loading: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
}
```

Comportamiento (mismo patrón que `RolesField`, research D5):

- `loadFailed` → `ErrorState` con `onRetry` (textos nuevos `modules.loadError.title/message`).
- `!loading && modules.length === 0` → `Alert severity="warning"` (texto nuevo `modules.empty`).
- si no, la lista de casillas: una por cada `modules` (en el orden recibido, sin reordenar), con
  `checked={resolveModuleSelection(selected, modules).has(module.key)}`,
  `disabled={module.key === REQUIRED_MODULE_KEY}`, nombre y descripción de `module.name`/
  `module.description` (ya no de `messages.subscriptions.modules.catalog`). Sin texto «Requiere X»: ya
  no hay dependencias que anunciar.
- contador: `text.marked(resolveModuleSelection(selected, modules).size, modules.length)` (D8).
- `onChange` de una casilla no requerida: `const next = new Set(selected); checked ? next.add(module.
  key) : next.delete(module.key); onChange(next);` (ya no llama a `withModuleChecked`, que se borra).
- mientras `loading`, antes de tener `modules`, se muestra un `CircularProgress` con
  `aria-label={messages.common.loading}` en vez de la lista (mismo patrón que el `content()` de
  `SubscriptionEditPage` al cargar la propia suscripción).

### `src/features/subscriptions/components/SubscriptionFormFields.tsx`

Un prop nuevo, que agrupa lo que antes estaba disperso en 4 (para no explotar la firma):

```ts
interface SubscriptionFormFieldsProps {
  // ...los que ya tiene...
  readonly clinicModules: {
    readonly modules: readonly ClinicModule[];
    readonly loading: boolean;
    readonly loadFailed: boolean;
    readonly onRetry: () => void;
  };
}
```

Se desestructura y se pasa a `<ModulesField control={control} errors={errors} modules={clinicModules.
modules} loading={clinicModules.loading} loadFailed={clinicModules.loadFailed} onRetry={clinicModules.
onRetry} />`.

### `src/features/subscriptions/components/SubscriptionPreviewPanel.tsx`

Un prop nuevo: `readonly modules: readonly ClinicModule[]`. Sustituye el `for (const key of
CLINIC_MODULE_ORDER)` por `for (const module of resolveModuleSelection(values.moduleKeys, modules)...`
— en concreto, recorre `modules` (no `CLINIC_MODULE_ORDER`) y separa incluidos/excluidos con
`resolveModuleSelection(values.moduleKeys, modules).has(module.key)` (research D6); usa `module.name`
en vez de `text.modules.catalog[key].name`.

### `src/features/subscriptions/components/SubscriptionCreatePage.tsx`

```ts
const modulesCatalog = useClinicModulesCatalog();
const modulesCatalogUsable = modulesCatalog.data !== undefined && modulesCatalog.data.length > 0;
```

- `save`: antes de `create.mutateAsync`, arma `const resolved: SubscriptionFormValues = { ...values,
  moduleKeys: resolveModuleSelection(values.moduleKeys, modulesCatalog.data ?? []) };` y usa `resolved`
  (research D11).
- `<FormFrame ... saveDisabled={!modulesCatalogUsable}>` (mismo patrón que `UserCreatePage`, research D5).
- `<SubscriptionFormFields ... clinicModules={{ modules: modulesCatalog.data ?? [], loading:
  modulesCatalog.isPending, loadFailed: modulesCatalog.isError && modulesCatalog.data === undefined,
  onRetry: () => { void modulesCatalog.refetch(); } }} />`.

### `src/features/subscriptions/components/SubscriptionEditPage.tsx`

- `SubscriptionEditPage` (el componente de arriba, no `EditSubscriptionForm`): agrega
  `const modulesCatalog = useClinicModulesCatalog();` junto a `useSubscription` (research D7, en
  paralelo), y pasa `modulesCatalog` como prop a `EditSubscriptionForm`.
- `EditSubscriptionForm`: recibe `modulesCatalog: UseQueryResult<ClinicModule[]>` como prop nueva;
  `toFormValues(initial)` sin cambios (research D7); en `save`, resuelve `values.moduleKeys` igual que
  en el alta antes de llamar a `toUpdateSubscriptionBody`; `saveDisabled` y el prop `clinicModules` de
  `SubscriptionFormFields` se arman igual que en `SubscriptionCreatePage`.

### `src/shared/messages/es.ts`

- `subscriptions.modules.marked`: `(count: number) => ...` → `(count: number, total: number) =>
  \`Marcados: ${count} de ${total}\`` (D8).
- Se agregan `subscriptions.modules.loadError: { title, message }` y `subscriptions.modules.empty`
  (D9), con la misma redacción que `users.form.rolesLoadError`/`rolesEmpty` adaptada a módulos:
  - `loadError.title`: «No se pudieron cargar los módulos».
  - `loadError.message`: «Sin la lista de módulos no se puede guardar la suscripción. Puedes reintentar.»
  - `empty`: «No hay módulos de clínica disponibles: no se puede guardar la suscripción.»
- `subscriptions.modules.catalog`/`subscriptions.modules.requires`: **sin cambios** (D3, D9: siguen
  vivos para el Comparativo y el detalle).

## Pruebas existentes que requieren reescritura (no solo ajuste de import)

| Archivo | Por qué |
|---|---|
| `ModulesField.test.tsx` | Props nuevos; ya no hay cascada de dependencias que probar; agrega carga/error/vacío, contador dinámico, Pacientes forzado aunque falte del Set inicial. |
| `SubscriptionFormFields.test.tsx` | El harness debe pasar `clinicModules` con datos fijos (sin MSW). |
| `SubscriptionPreviewPanel.test.tsx` | El harness debe pasar `modules` con datos fijos, en vez de depender de `messages.subscriptions.modules.catalog`. |
| `SubscriptionCreatePage.test.tsx`, `SubscriptionEditPage.test.tsx` | Deben registrar `createClinicModulesCatalogMock()`; casos nuevos para carga/error/vacío del catálogo y Guardar deshabilitado. |
| `src/app/router/subscriptions/createSubscription.integration.test.tsx`, `editSubscription.integration.test.tsx` | Deben registrar `createClinicModulesCatalogMock()` para que el formulario cargue. |
| `subscriptionForm.test.ts` | Tipos de `moduleKeys` (ya no `ClinicModuleKey`); `toFormValues` ya no filtra contra `CLINIC_MODULE_ORDER`. |

## Pruebas existentes que solo necesitan ajustar el import (la key sigue siendo válida)

`useCreateSubscription.test.tsx`, `ClinicLimitsFields.test.tsx`, `ClinicsLimitField.test.tsx`,
`OtherFeaturesField.test.tsx`, `SelfServiceAndTrialFields.test.tsx`, `SubscriptionTypeField.test.tsx`:
usan `REQUIRED_MODULE_KEY`/`ClinicModuleKey` de `clinicModuleCatalog.ts` solo como una key literal
válida para armar un `moduleKeys` de prueba, sin relación con el comportamiento de esta feature. Como
`clinicModuleCatalog.ts` no se toca (research D3), **no necesitan ningún cambio**.
