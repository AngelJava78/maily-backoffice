# Modelo de datos: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Feature**: `020-subscriptions-ui-improvements` | **Fecha**: 2026-10-27 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Describe solo lo que esta feature agrega o cambia sobre [../019-add-clinics-limit/data-model.md](../019-add-clinics-limit/data-model.md) y los modelos de las features 003/012/018, que siguen siendo válidos en todo lo demás. Ningún campo de `Subscription` cambia: todo lo que sigue es presentación y estado navegable nuevos sobre datos que ya existen.

## `SubscriptionsLocation` (amplía a la de las features 003/018)

| Campo | Tipo | Parámetro URL | Reglas |
|---|---|---|---|
| `sort` | `SubscriptionsSort` | `sort` | **Nuevo** (research D2). `{ field: SubscriptionsSortField; direction: 'asc' \| 'desc' }`. `SubscriptionsSortField` = `'name' \| 'subscriptionType' \| 'clinicsCount' \| 'consultingRoomsLimit' \| 'monthlyPrice' \| 'annualPrice' \| 'status'` (las siete columnas del listado, FR-004). Por defecto `{ field: 'monthlyPrice', direction: 'asc' }` (FR-006), que se omite de la URL. Se lee de un único parámetro: ausente o inválido → el valor por defecto; `sort=<campo>` → ascendente; `sort=-<campo>` → descendente. |
| `comparisonType` | `SubscriptionTypeId` | `type_id` | **Nuevo** (research D3). Reutiliza el tipo ya existente de `subscriptionTypeCatalog.ts` (`SUBSCRIPTION_TYPE.INDIVIDUAL \| .ENTERPRISE`, sin un tipo propio nuevo). Filtra qué planes se comparan (FR-007). Por defecto `SUBSCRIPTION_TYPE.INDIVIDUAL` (Assumptions del spec), que se omite de la URL (`type_id=2` para Empresarial; cualquier otro valor cae al valor por defecto, mismo criterio de tolerancia que ya usa el resto de este archivo). Sin efecto en la pestaña Listado (campo igual de presente en el tipo, como ya ocurre hoy con `page`/`pageSize` respecto del Comparativo). |

`page`, `pageSize` y `tab` (003/018) quedan sin cambio en su forma; `setPageSize` y el nuevo `setSort` (ver abajo) comparten el mismo criterio de regresar a la página 1 (research D9).

## `useSubscriptionsLocation` (amplía a la de la 003)

Dos funciones nuevas en `SubscriptionsLocationApi`:

```ts
/** Cambia el orden del listado, lo que regresa a la página 1 (research D9). */
readonly setSort: (sort: SubscriptionsSort) => void;
/** Cambia el filtro de tipo del Comparativo; no afecta la paginación, que no existe ahí. */
readonly setComparisonType: (type: SubscriptionTypeId) => void;
```

## `SubscriptionsGrid` (amplía a la de la 003)

Columnas, en el orden exacto de FR-004 (`Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual, Estatus`):

| Columna (`field`) | `headerName` | Valor de orden (`valueGetter`) | Presentación (`valueFormatter`/`renderCell`) |
|---|---|---|---|
| `name` | `text.list.columns.name` | — (sin cambio) | `renderCell` ya existente (enlace al detalle) |
| `subscriptionType` | `text.list.columns.subscriptionType` (**nuevo texto**, `'Tipo'`) | `subscription.subscriptionType.name` | el mismo texto (`'Individual'`/`'Empresarial'`) |
| `clinicsCount` | `text.list.columns.clinics` (sin cambio) | `subscription.clinicsCount` (`number \| null`, antes era ya el texto formateado) | `value === null ? text.clinics.notAvailable : String(value)` |
| `consultingRoomsLimit` | `text.list.columns.consultingRoomsLimit` (**nuevo texto**, `'Consultorios'`) | `subscription.consultingRoomsLimit` | `String(value)` |
| `monthlyPrice` | `text.list.columns.monthlyPrice` (sin cambio) | `toCents(subscription.monthlyPrice)` (research D7, D10) | `text.price.perMonth(formatMxn((value / 100).toFixed(2)))` |
| `annualPrice` | `text.list.columns.annualPrice` (**nuevo texto**, `'Precio anual'`) | `toCents(subscription.annualPrice)` | `text.price.perYear(formatMxn((value / 100).toFixed(2)))` |
| `status` | `text.list.columns.status` (sin cambio) | — (sin cambio) | `renderCell` ya existente (`SubscriptionStatusChip`) |

`monthlyPrice`, `annualPrice`, `clinicsCount` y `consultingRoomsLimit` llevan `type: 'number'` (comparador numérico correcto; D10). Se quita `disableColumnSorting`; se agrega `sortingMode="server"`, `sortingOrder={['asc', 'desc']}` y dos props controladas nuevas:

```ts
readonly sort: SubscriptionsSort;
readonly onSortChange: (sort: SubscriptionsSort) => void;
```

mapeadas al `sortModel`/`onSortModelChange` de `DataGrid` (un único elemento, ya que esta feature no pide ordenar por más de una columna a la vez).

## `SubscriptionsListPage` — `listPanel()` (amplía a la de la 003)

Antes de `pageOf`, el arreglo completo se ordena por `location.sort`:

```ts
const sorted = sortSubscriptions(query.data ?? [], location.sort); // nuevo, ver abajo
const shown = pageOf(sorted, location.page, location.pageSize);
```

## `SubscriptionsListPage` — `comparisonPanel()` (amplía a la de la 018)

```ts
const filtered = query.data.filter(
  (subscription) => subscription.subscriptionType.id === location.comparisonType,
);
const sorted = sortByCyclePrice(filtered, cycle); // nuevo, ver abajo
```

- `filtered.length === 0` → `EmptyState` con un texto nuevo (`comparison.emptyForType`, parametrizado con el nombre del tipo vigente), en vez de la tabla (FR-007, edge case).
- Si no, `sorted` se pasa a `SubscriptionsComparisonTable` (su `subscriptions` prop, sin cambio de forma).
- El control nuevo (`ComparisonTypeFilter`, ver abajo) se agrega al `Stack` que ya envuelve `PriceCycleToggle`, **antes** de él (FR-007: el orden visual de los controles).

## `sortSubscriptions` / `sortByCyclePrice` (nuevas; `schemas/subscriptionsSort.ts`)

```ts
export function sortSubscriptions(
  subscriptions: readonly Subscription[],
  sort: SubscriptionsSort,
): Subscription[];

/** El orden del Comparativo (spec, User Story 3 escenario 6): siempre ascendente, por el precio del ciclo vigente. */
export function sortByCyclePrice(
  subscriptions: readonly Subscription[],
  cycle: PriceCycle,
): Subscription[];
```

Funciones puras (sin estado, sin efectos), junto al resto de la lógica de `schemas/` de esta feature (mismo patrón ya usado por `price.ts`). `sortSubscriptions` resuelve cada `SubscriptionsSortField` a un valor comparable (`toCents` para los dos precios, research D7; el campo crudo para el resto) y aplica la dirección pedida; un empate no tiene criterio de desempate propio (se mantiene el orden relativo que ya traía el arreglo, comportamiento estándar de un ordenamiento estable).

## `ComparisonTypeFilter` (nuevo; `components/ComparisonTypeFilter.tsx`)

```ts
interface ComparisonTypeFilterProps {
  readonly value: SubscriptionTypeId;
  readonly onChange: (type: SubscriptionTypeId) => void;
}
```

Mismo patrón exacto que `PriceCycleToggle.tsx` (research D3): `ToggleButtonGroup` exclusivo, tamaño pequeño, con el guard `if (next !== null)`. Las dos opciones usan el texto ya existente del catálogo de tipos (`text.types.catalog[SUBSCRIPTION_TYPE.INDIVIDUAL].name` = «Individual», `[...ENTERPRISE].name` = «Empresarial»), sin texto nuevo.

## `SubscriptionsComparisonTable` (amplía a la de la 018)

- Nueva fila, primera de la sección «Límites de la clínica» (antes de `LIMIT_FIELDS`, research D4): `label={comparison.sections.clinicsLimit}` (**nuevo texto**, `'Límite de clínicas'`), `cell={(subscription) => subscription.clinicsLimit ?? text.clinics.notAvailable}`.
- Sección «Módulos»: cada celda cambia de `comparison.moduleIncluded`/`moduleNotIncluded` (texto) a:

```tsx
<Icon
  name={included ? 'included' : 'not-included'}
  color={included ? 'exito' : 'peligro'}
  accessibleName={included ? comparison.moduleIncluded : comparison.moduleNotIncluded}
/>
```

  (research D5; cero texto nuevo, mismo texto ya existente como nombre accesible).
- Sin cambios en su propio arreglo de props: la columna/plan sigue siendo un elemento de `subscriptions`, ya filtrado y ordenado por quien la llama (`comparisonPanel()`), tal como ya ocurre hoy (research, `SubscriptionsComparisonTable.tsx` no filtra ni ordena nada por su cuenta).

## `iconRegistry` (amplía a la de la 016)

Dos claves nuevas (research D6), junto a las 29 ya existentes:

```ts
import { Check, X } from 'lucide-react'; // + a los ya importados

included: Check,
'not-included': X,
```

## `shared/messages/es.ts` (amplía a la de las features 003/012/018/019)

| Clave | Texto | Uso |
|---|---|---|
| `subscriptions.list.columns.subscriptionType` | `'Tipo'` | Columna nueva del listado |
| `subscriptions.list.columns.consultingRoomsLimit` | `'Consultorios'` | Columna nueva del listado |
| `subscriptions.list.columns.annualPrice` | `'Precio anual'` | Columna nueva del listado |
| `subscriptions.comparison.sections.clinicsLimit` | `'Límite de clínicas'` | Fila nueva de «Límites de la clínica» |
| `subscriptions.comparison.emptyForType` | `(typeName: string) => \`No hay suscripciones de tipo ${typeName} para comparar.\`` | Aviso cuando el filtro de tipo no tiene ningún plan (FR-007, edge case) |

`subscriptions.comparison.moduleIncluded`/`moduleNotIncluded` y `subscriptions.types.catalog` (003/018) no cambian; se reutilizan tal cual (research D5, `ComparisonTypeFilter` arriba).

## `SubscriptionFormFields` (amplía a la de la 019)

- `ClinicsLimitField` se mueve del lugar donde hoy está (justo después de `SubscriptionTypeField`, antes de nombre/descripción/precios) al final del formulario, dentro del mismo `Stack` que ya envuelve `ClinicLimitsFields`, como su primer elemento (FR-001, Assumptions).
- Ese `Stack` gana un título propio, `<Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold' }}>{text.fields.limits}</Typography>` (**nuevo texto**, `subscriptions.form.fields.limits` = `'Límites'`), con el mismo patrón que ya usa el título de `ModulesField` (`text.fields.modules` = `'Módulos incluidos'`) — mismo componente, mismas props de tipografía (FR-002).
- Ningún otro comportamiento de `ClinicsLimitField` ni de `ClinicLimitsFields` cambia (FR-003): siguen siendo los mismos dos componentes, solo se mueve dónde se renderizan dentro de `SubscriptionFormFields.tsx`.
