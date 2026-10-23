# Modelo de datos: Planes de suscripción (precio anual, módulos, límites y comparativo)

**Feature**: `012-configure-subscription-plans` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Describe solo lo que esta feature agrega o cambia sobre [../003-manage-subscription-types/data-model.md](../003-manage-subscription-types/data-model.md), que sigue siendo válido en todo lo demás (`SubscriptionStatus`, la máquina de estados, `parseSubscriptionId`, `SubscriptionDetailLocationState`, `SubscriptionCapabilities`, las acciones del detalle y las claves de TanStack Query). `Subscription` se documenta completo porque su forma cambia de fondo.

## `Subscription` (reemplaza a la de la 003)

Sale de `SubscriptionRead`, verificado contra `maily-system-api/src/dtos/subscription.py` el 2026-10-23.

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero de 1 a 2 147 483 647 | `id` | Sin cambios (003). |
| `name` | texto no vacío | `name` | Sin cambios (003). |
| `description` | texto o `null` | `description` | Sin cambios (003). |
| `monthlyPrice` | texto decimal | `monthly_price` | Sin cambios (003): `^\d{1,8}\.\d{2}$`, comparado en centavos (`toCents`). |
| `annualPrice` | texto decimal | `annual_price` | **Nuevo**. Mismo patrón que `monthlyPrice`; independiente (sin proporción obligatoria con el mensual). |
| `trialDays` | entero de 0 a 3650 | `trial_days` | **Nuevo**. `0` = sin periodo de prueba. |
| `selfService` | booleano | `self_service` | **Nuevo**. Verdadero = «Autoconsumo» (aparece en el portal de MailySoft); falso = «A la medida». |
| `moduleKeys` | lista de texto | `module_keys` | **Nuevo**. Siempre incluye `"patients"`. Puede traer una clave fuera del catálogo fijo de nueve (research D3): esa clave se conserva en el dato pero la interfaz no la pinta ni la ofrece. |
| `otherFeatures` | lista de texto | `other_features` | **Reemplaza a `features`** (research D2). Mismas reglas que tenía `features`: en el orden guardado, de 0 a 20 elementos de 1 a 150 caracteres; puede estar vacía. |
| `consultingRoomsLimit` | entero de 0 a 1 000 000 | `consulting_rooms_limit` | **Nuevo**. Techo informativo; no se valida contra el uso real de la clínica. |
| `doctorsLimit` | entero de 0 a 1 000 000 | `doctors_limit` | **Nuevo**. Igual. |
| `assistantsLimit` | entero de 0 a 1 000 000 | `assistants_limit` | **Nuevo**. Igual. |
| `newPatientsPerYearLimit` | entero de 0 a 1 000 000 | `new_patients_per_year_limit` | **Nuevo**. Igual. |
| `status` | `{ id, name }` | `status` | Sin cambios (003). |
| `clinicsCount` | entero ≥ 0 o `null` | `clinics_count` | Sin cambios (003). |
| `createdAt`, `updatedAt` | fecha y hora con zona | `created_at`, `updated_at` | Sin cambios (003). |

## `ClinicModuleCatalog` (nuevo; `schemas/clinicModuleCatalog.ts`, dato fijo, no sale de ninguna respuesta)

| Constante | Forma | Contenido |
|---|---|---|
| `CLINIC_MODULE_ORDER` | tupla de 9 claves | `patients`, `scheduling`, `reminders`, `clinical_records`, `clinical_record_templates`, `prescriptions`, `finance`, `reports`, `billing`, en este orden (FR-007). |
| `ClinicModuleKey` | tipo | `(typeof CLINIC_MODULE_ORDER)[number]`. |
| `REQUIRED_MODULE_KEY` | `ClinicModuleKey` | `"patients"`: siempre incluido, no se puede desmarcar (FR-008). |
| `MODULE_PREREQUISITE` | `Partial<Record<ClinicModuleKey, ClinicModuleKey>>` | `reminders`→`scheduling`, `clinical_record_templates`→`clinical_records`, `prescriptions`→`clinical_records`, `billing`→`finance` (FR-007, FR-009). |

El nombre y la descripción visibles de cada clave viven en `messages.subscriptions.modules.catalog[key]`, no en este archivo (constitución VI: textos centralizados).

## `withModuleChecked` (nuevo; `policy/moduleSelection.ts`)

```ts
function withModuleChecked(
  selected: ReadonlySet<ClinicModuleKey>,
  key: ClinicModuleKey,
  checked: boolean,
): ReadonlySet<ClinicModuleKey>
```

Función pura (research D4): al marcar, agrega `key` y su cadena de requisitos (`MODULE_PREREQUISITE`); al desmarcar, quita `key` y todo lo que dependía de ella, directa o indirectamente. `ModulesField` la usa en cada cambio y nunca permite que el conjunto final tenga un dependiente sin su requisito (FR-009). `REQUIRED_MODULE_KEY` nunca se envía como argumento, porque su casilla está deshabilitada.

## `AnnualSavings` (nuevo; `schemas/price.ts`)

```ts
interface AnnualSavings {
  readonly amountCents: number;             // mensual × 12 − anual, > 0
  readonly percent: number;                 // redondeado al entero más cercano
  readonly monthlyEquivalentCents: number;  // anual ÷ 12, redondeado al centavo
}
function computeAnnualSavings(monthlyPrice: string, annualPrice: string): AnnualSavings | null
```

`null` cuando el precio anual no resulta en un ahorro (igual o mayor que 12 mensualidades, FR-005). Todo en centavos enteros (research D5).

## `SubscriptionsLocation` (amplía a la de la 003)

| Campo | Tipo | Regla | Por defecto |
|---|---|---|---|
| `page`, `pageSize` | — | Sin cambios (003). | 1, 10 |
| `tab` | `'list' \| 'comparison'` | **Nuevo** (`?tab=comparison`; research D8). Un valor desconocido se reemplaza por el de por defecto, igual que `page`. | `'list'` |

`toSubscriptionsSearchParams` sigue omitiendo lo que es el valor por defecto. `page` y `pageSize` se conservan al cambiar de pestaña (no se reinician): volver a Listado deja al operador donde estaba.

## Formulario: `SubscriptionFormValues` (amplía al de la 003)

| Campo | Tipo | Reglas (mensajes en `es.ts`) |
|---|---|---|
| `name`, `description`, `monthlyPrice` | — | Sin cambios (003). |
| `annualPrice` | texto | **Nuevo**. Recortado; obligatorio; mismo patrón que `monthlyPrice` (`^\d{1,8}(\.\d{1,2})?$`); independiente. |
| `trialDays` | texto o número (según el control) | **Nuevo**. Entero de 0 a 3650; vacío no es válido (FR-013: el alta abre en `0`, nunca vacío). |
| `selfService` | booleano | **Nuevo**. Por defecto `false` en el alta (FR-013). |
| `moduleKeys` | `ReadonlySet<ClinicModuleKey>` | **Nuevo**. Siempre contiene `REQUIRED_MODULE_KEY`; el resto, sujeto a `MODULE_PREREQUISITE` (FR-009); se compara como conjunto, no como lista, al decidir si cambió (research D4, FR-017). |
| `consultingRoomsLimit`, `doctorsLimit`, `assistantsLimit`, `newPatientsPerYearLimit` | texto o número | **Nuevos**. Enteros de 0 a 1 000 000; los cuatro obligatorios (FR-010). |
| `otherFeatures` | lista de `{ value }` | **Antes `features`** (research D2); mismas reglas: de 0 a 20 (`MAX_OTHER_FEATURES`), cada `value` de 1 a 150 recortado. |

Valores iniciales del alta: `{ ..., annualPrice: '', trialDays: 0, selfService: false, moduleKeys: new Set([REQUIRED_MODULE_KEY]), consultingRoomsLimit: '', doctorsLimit: '', assistantsLimit: '', newPatientsPerYearLimit: '', otherFeatures: [] }`. En la edición, los valores de la suscripción (`moduleKeys` como `new Set(subscription.moduleKeys)`, filtrado a las nueve claves conocidas).

**`toCreateSubscriptionBody(values)`** (S3): agrega `annual_price`, `trial_days`, `self_service`, `module_keys: [...values.moduleKeys]` y los cuatro límites a lo que ya enviaba la 003; `other_features` sustituye a `features`.

**`toUpdateSubscriptionBody(initial, values)`** (S4): la comparación campo por campo de la 003 se extiende:

| Dato | Cambió si… | Se envía |
|---|---|---|
| `annual_price` | `toCents` del texto es distinto del de `initial.annualPrice` | el texto recortado |
| `trial_days` | el número es distinto de `initial.trialDays` | el número |
| `self_service` | es distinto de `initial.selfService` | el booleano |
| `module_keys` | el conjunto marcado, comparado sin importar el orden, es distinto de `new Set(initial.moduleKeys)` | el conjunto completo, como lista |
| `consulting_rooms_limit`, `doctors_limit`, `assistants_limit`, `new_patients_per_year_limit` | el número es distinto del de `initial` | el número |
| `other_features` | igual que `features` en la 003 (cambia el número de elementos o algún elemento recortado) | la lista completa, recortada |

Con todo igual a `initial`, sigue sin haber solicitud (FR-017, igual que FR-008/FR-012 de la 003).

**Errores del servidor por campo**: se agrega `module_keys` → la sección «Módulos incluidos» (`subscription_module_prerequisite_missing`, `subscription_module_not_found`, research D10), `annual_price`, `trial_days`, `self_service`, `consulting_rooms_limit`, `doctors_limit`, `assistants_limit` y `new_patients_per_year_limit` → su propio campo; `other_features` sustituye a `features` en el mapa de la 003.

## `SubscriptionErrorOutcome` (amplía al de la 003)

Se agregan dos `code` al mapa de `describeSubscriptionError` (research D10):

| `code` | Estado | `kind` |
|---|---|---|
| `subscription_module_prerequisite_missing` | 409 | `field` (campo `moduleKeys`) |
| `subscription_module_not_found` | 422 | `field` (campo `moduleKeys`) |
| `module_check_unavailable` | 503 | `retryable` (como `authorization_unavailable`) |

## Comparativo: `buildComparisonColumns` (nuevo; `policy/comparisonTable.ts`)

```ts
function buildComparisonColumns(subscriptions: readonly Subscription[]): readonly Subscription[]
```

Es `sortCatalog(subscriptions)` tal cual (research D6): una columna por suscripción vigente, en el mismo orden fijo del listado (FR-018). Las filas de la matriz («Módulos», «Límites de la clínica», «Otras funcionalidades», «Otros») se recorren en el componente a partir de `CLINIC_MODULE_ORDER` y de las cuatro claves de límite: no necesitan su propio modelo, porque leen directamente los campos de cada `Subscription` de la columna.

## Trazabilidad con los requisitos

| Entidad o regla | Requisitos |
|---|---|
| `Subscription` (campos nuevos) | FR-002, FR-003, FR-004, FR-005, FR-006, FR-016 |
| `ClinicModuleCatalog`, `withModuleChecked` | FR-007, FR-008, FR-009, SC-003 |
| `computeAnnualSavings` | FR-005, FR-014, SC-004 |
| `SubscriptionsLocation.tab` | FR-001, FR-018, FR-019, SC-005 |
| `SubscriptionFormValues` (campos nuevos), `toCreateSubscriptionBody`, `toUpdateSubscriptionBody` | FR-010, FR-011, FR-012, FR-013, FR-016, FR-017 |
| `SubscriptionErrorOutcome` (códigos nuevos) | FR-015 |
| `buildComparisonColumns` | FR-018, FR-020, FR-021 |
